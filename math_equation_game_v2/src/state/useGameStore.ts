import { create } from 'zustand';
import { BinaryOperator, EquationState } from '../engine/types';
import { getPeelableNodes, validateMove, PeelableNodeInfo } from '../engine/validator';
import { applyMove } from '../engine/transformer';
import { applySimplification } from '../engine/simplifier';
import { equationGenerator } from '../generator/generator';
import { LEVEL_PRESETS } from '../generator/presets';
import { parseEquation } from '../engine/parser';
import { cloneAST } from '../engine/ast';
import { soundFx } from '../utils/sound';
import { fireCelebrationConfetti } from '../utils/formatters';

export interface GameState {
  // Game Configuration & Progression
  mode: 'campaign' | 'sandbox';
  currentLevel: number;
  currentPresetId: string | null;
  score: number;
  stars: Record<string, number>; // presetId -> 1..3 stars

  // Current Equation State
  equation: EquationState | null;
  history: EquationState[];
  historyIndex: number;
  stepDescriptions: string[];

  // Interactivity State
  activeSelectedNodeId: string | null;
  activePeelableInfo: PeelableNodeInfo | null;
  shakeNodeId: string | null;
  feedback: {
    type: 'success' | 'error' | 'hint' | 'info';
    message: string;
  } | null;

  // Stats for Rating
  invalidClicksCount: number;
  hintsUsedCount: number;
  isMuted: boolean;

  // Modals & Overlays
  showVictoryModal: boolean;
  showSandboxModal: boolean;
  showPresetsModal: boolean;

  // Actions
  loadLevel: (level: number) => void;
  loadPreset: (presetId: string) => void;
  loadCustomEquation: (equationStr: string) => boolean;
  handleNodeClick: (nodeId: string) => void;
  submitInverseOp: (op: BinaryOperator) => void;
  handleSimplify: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
  resetCurrentEquation: () => void;
  requestHint: () => void;
  toggleSound: () => void;
  dismissFeedback: () => void;
  closeModal: () => void;
  setShowSandboxModal: (show: boolean) => void;
  setShowPresetsModal: (show: boolean) => void;
  setMode: (mode: 'campaign' | 'sandbox') => void;
  nextPuzzle: () => void;
  generateRandomPuzzle: (level?: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'campaign',
  currentLevel: 1,
  currentPresetId: 'preset_1_1',
  score: 0,
  stars: {},

  equation: null,
  history: [],
  historyIndex: -1,
  stepDescriptions: [],

  activeSelectedNodeId: null,
  activePeelableInfo: null,
  shakeNodeId: null,
  feedback: null,

  invalidClicksCount: 0,
  hintsUsedCount: 0,
  isMuted: false,

  showVictoryModal: false,
  showSandboxModal: false,
  showPresetsModal: false,

  loadPreset: (presetId: string) => {
    const preset = LEVEL_PRESETS.find(p => p.id === presetId) || LEVEL_PRESETS[0];
    try {
      const eq = parseEquation(preset.equationStr);
      eq.solution = preset.solution;
      eq.targetVariable = preset.targetVariable;
      eq.difficultyLevel = preset.level;

      set({
        equation: eq,
        history: [cloneEquation(eq)],
        historyIndex: 0,
        stepDescriptions: [`Loaded: ${preset.title}`],
        currentLevel: preset.level,
        currentPresetId: preset.id,
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        shakeNodeId: null,
        feedback: { type: 'info', message: preset.description },
        invalidClicksCount: 0,
        hintsUsedCount: 0,
        showVictoryModal: false
      });
      soundFx.playSelect();
    } catch (e) {
      console.error(e);
    }
  },

  loadLevel: (level: number) => {
    const matchingPreset = LEVEL_PRESETS.find(p => p.level === level);
    if (matchingPreset) {
      get().loadPreset(matchingPreset.id);
    } else {
      const generated = equationGenerator.generate({ level });
      set({
        equation: generated,
        history: [cloneEquation(generated)],
        historyIndex: 0,
        stepDescriptions: [`Generated Level ${level} Equation`],
        currentLevel: level,
        currentPresetId: null,
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        shakeNodeId: null,
        feedback: { type: 'info', message: `เป้าหมาย: ทำให้ ${generated.targetVariable} อยู่ตัวเดียวให้ได้!` },
        invalidClicksCount: 0,
        hintsUsedCount: 0,
        showVictoryModal: false
      });
      soundFx.playSelect();
    }
  },

  generateRandomPuzzle: (level?: number) => {
    const targetLevel = level ?? get().currentLevel;
    const generated = equationGenerator.generate({ level: targetLevel });
    set({
      equation: generated,
      history: [cloneEquation(generated)],
      historyIndex: 0,
      stepDescriptions: [`Generated Random Level ${targetLevel} Equation`],
      currentLevel: targetLevel,
      currentPresetId: null, // Since it's a generated random one
      activeSelectedNodeId: null,
      activePeelableInfo: null,
      shakeNodeId: null,
      feedback: { type: 'info', message: `เป้าหมาย: ทำให้ ${generated.targetVariable} อยู่ตัวเดียวให้ได้!` },
      invalidClicksCount: 0,
      hintsUsedCount: 0,
      showVictoryModal: false
    });
    soundFx.playSelect();
  },

  loadCustomEquation: (equationStr: string): boolean => {
    try {
      const parsed = parseEquation(equationStr);
      set({
        equation: parsed,
        history: [cloneEquation(parsed)],
        historyIndex: 0,
        stepDescriptions: [`Custom equation: ${equationStr}`],
        currentPresetId: null,
        mode: 'sandbox',
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        shakeNodeId: null,
        feedback: { type: 'info', message: `โหลดโจทย์สำเร็จ! เป้าหมายคือหา '${parsed.targetVariable}'` },
        invalidClicksCount: 0,
        hintsUsedCount: 0,
        showVictoryModal: false,
        showSandboxModal: false
      });
      soundFx.playSelect();
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid equation format.';
      set({
        feedback: { type: 'error', message: msg }
      });
      soundFx.playInvalidBoop();
      return false;
    }
  },

  handleNodeClick: (nodeId: string) => {
    const { equation } = get();
    if (!equation || equation.isSolved) return;

    const validation = validateMove(equation, nodeId);

    if (validation.isValid && validation.peelableNodeId) {
      const peelables = getPeelableNodes(equation.lhs, equation.targetVariable);
      const matched = peelables.find(p => p.nodeId === nodeId);

      if (matched) {
        soundFx.playSelect();
        set({
          activeSelectedNodeId: nodeId,
          activePeelableInfo: matched,
          feedback: null
        });
      }
    } else {
      // Invalid move clicked!
      soundFx.playInvalidBoop();
      set(state => ({
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        shakeNodeId: nodeId,
        invalidClicksCount: state.invalidClicksCount + 1,
        feedback: {
          type: 'error',
          message: validation.errorMessage || 'This term cannot be moved yet!'
        }
      }));

      // Reset shake after animation
      setTimeout(() => {
        set({ shakeNodeId: null });
      }, 450);
    }
  },

  submitInverseOp: (selectedOp: BinaryOperator) => {
    const { equation, activeSelectedNodeId, history, historyIndex, invalidClicksCount, hintsUsedCount, currentPresetId } = get();
    if (!equation || !activeSelectedNodeId) return;

    const moveRes = applyMove(equation, activeSelectedNodeId, selectedOp);

    if (moveRes.success) {
      soundFx.playPeelSuccess();

      const newHistory = [...history.slice(0, historyIndex + 1), cloneEquation(moveRes.newEquation)];

      let calculatedStars = 3;
      if (invalidClicksCount >= 3 || hintsUsedCount >= 2) calculatedStars = 1;
      else if (invalidClicksCount >= 1 || hintsUsedCount >= 1) calculatedStars = 2;

      const isVictorious = moveRes.newEquation.isSolved;
      if (isVictorious) {
        soundFx.playVictory();
        fireCelebrationConfetti();
      }

      set(state => ({
        equation: moveRes.newEquation,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        stepDescriptions: [...state.stepDescriptions, moveRes.message],
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        feedback: { type: 'success', message: moveRes.message },
        showVictoryModal: isVictorious,
        score: isVictorious ? state.score + calculatedStars * 100 : state.score + 10,
        stars: currentPresetId && isVictorious
          ? { ...state.stars, [currentPresetId]: Math.max(state.stars[currentPresetId] || 0, calculatedStars) }
          : state.stars
      }));
    } else {
      soundFx.playInvalidBoop();
      set(state => ({
        invalidClicksCount: state.invalidClicksCount + 1,
        feedback: { type: 'error', message: moveRes.message }
      }));
    }
  },

  handleSimplify: (nodeId: string) => {
    const { equation, history, historyIndex } = get();
    if (!equation) return;

    const res = applySimplification(equation, nodeId);
    if (res.success) {
      soundFx.playSimplify();
      const newHistory = [...history.slice(0, historyIndex + 1), cloneEquation(res.newEquation)];

      set(state => ({
        equation: res.newEquation,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        stepDescriptions: [...state.stepDescriptions, res.message],
        feedback: { type: 'success', message: res.message }
      }));
    }
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevEq = history[historyIndex - 1];
      set({
        equation: cloneEquation(prevEq),
        historyIndex: historyIndex - 1,
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        showVictoryModal: false,
        feedback: { type: 'info', message: 'ย้อนกลับก้าวเมื่อกี้แล้วจ้า' }
      });
      soundFx.playSelect();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextEq = history[historyIndex + 1];
      set({
        equation: cloneEquation(nextEq),
        historyIndex: historyIndex + 1,
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        showVictoryModal: nextEq.isSolved,
        feedback: { type: 'info', message: 'ทำซ้ำก้าวตะกี้แล้วจ้า' }
      });
      soundFx.playSelect();
    }
  },

  resetCurrentEquation: () => {
    const { history } = get();
    if (history.length > 0) {
      const initialEq = history[0];
      set({
        equation: cloneEquation(initialEq),
        historyIndex: 0,
        activeSelectedNodeId: null,
        activePeelableInfo: null,
        showVictoryModal: false,
        invalidClicksCount: 0,
        hintsUsedCount: 0,
        feedback: { type: 'info', message: 'รีเซ็ตกลับไปจุดเริ่มต้นแล้ว!' }
      });
      soundFx.playSelect();
    }
  },

  requestHint: () => {
    const { equation, currentPresetId } = get();
    if (!equation || equation.isSolved) return;

    set(state => ({ hintsUsedCount: state.hintsUsedCount + 1 }));

    // 1. Check if preset has hints
    if (currentPresetId) {
      const preset = LEVEL_PRESETS.find(p => p.id === currentPresetId);
      if (preset && preset.hints.length > 0) {
        const hintIdx = Math.min(get().hintsUsedCount - 1, preset.hints.length - 1);
        set({
          feedback: { type: 'hint', message: `💡 คำใบ้: ${preset.hints[hintIdx]}` }
        });
        soundFx.playSelect();
        return;
      }
    }

    // 2. Dynamic hint based on peelable node
    const peelable = getPeelableNodes(equation.lhs, equation.targetVariable);
    if (peelable.length > 0) {
      const p = peelable[0];
      const opNames: Record<BinaryOperator, string> = {
        '+': 'subtract (-)',
        '-': 'add (+)',
        '*': 'divide (÷)',
        '/': 'multiply (×)'
      };
      set({
        activeSelectedNodeId: p.nodeId,
        activePeelableInfo: p,
        feedback: {
          type: 'hint',
          message: `💡 Hint: Look at term '${p.displayLabel}'! Use ${opNames[p.requiredInverseOp]} to peel it away.`
        }
      });
      soundFx.playSelect();
    }
  },

  toggleSound: () => {
    const newMuted = soundFx.toggleMute();
    set({ isMuted: newMuted });
  },

  dismissFeedback: () => {
    set({ feedback: null });
  },

  closeModal: () => {
    set({ activeSelectedNodeId: null, activePeelableInfo: null });
  },

  setShowSandboxModal: (show: boolean) => set({ showSandboxModal: show }),
  setShowPresetsModal: (show: boolean) => set({ showPresetsModal: show }),
  setMode: (mode: 'campaign' | 'sandbox') => set({ mode }),

  nextPuzzle: () => {
    const { currentPresetId, currentLevel } = get();
    if (currentPresetId) {
      const currentIdx = LEVEL_PRESETS.findIndex(p => p.id === currentPresetId);
      if (currentIdx !== -1 && currentIdx + 1 < LEVEL_PRESETS.length) {
        get().loadPreset(LEVEL_PRESETS[currentIdx + 1].id);
        return;
      }
    }
    // Otherwise load next level
    // const nextLvl = Math.min(5, currentLevel + 1);
    get().loadLevel(currentLevel);
  }
}));

function cloneEquation(eq: EquationState): EquationState {
  return {
    ...eq,
    lhs: cloneAST(eq.lhs, false),
    rhs: cloneAST(eq.rhs, false),
    solution: { ...eq.solution }
  };
}
