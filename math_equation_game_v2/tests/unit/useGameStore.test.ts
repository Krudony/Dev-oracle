import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../../src/state/useGameStore';
import { LEVEL_PRESETS } from '../../src/generator/presets';
import { getPeelableNodes } from '../../src/engine/validator';

// Mock soundFx so we don't try to play audio in tests
vi.mock('../../src/utils/sound', () => ({
  soundFx: {
    playSelect: vi.fn(),
    playPeelSuccess: vi.fn(),
    playVictory: vi.fn(),
    playInvalidBoop: vi.fn(),
    playSimplify: vi.fn(),
    toggleMute: vi.fn().mockReturnValue(true)
  }
}));

// Mock confetti
vi.mock('../../src/utils/formatters', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    fireCelebrationConfetti: vi.fn()
  };
});

describe('UI Interaction Simulations (Store)', () => {
  beforeEach(() => {
    // Reset state before each test
    const store = useGameStore.getState();
    store.resetCurrentEquation();
    store.setMode('campaign');
  });

  it('loads a preset and initializes game state correctly', () => {
    const store = useGameStore.getState();
    const preset = LEVEL_PRESETS[0];
    store.loadPreset(preset.id);
    
    const newState = useGameStore.getState();
    expect(newState.equation).toBeDefined();
    expect(newState.equation?.initialEquationStr).toBe(preset.equationStr);
    expect(newState.currentLevel).toBe(preset.level);
    expect(newState.currentPresetId).toBe(preset.id);
    expect(newState.historyIndex).toBe(0);
    expect(newState.history.length).toBe(1);
    expect(newState.showVictoryModal).toBe(false);
  });

  it('simulates handling invalid node clicks', () => {
    const store = useGameStore.getState();
    store.loadPreset(LEVEL_PRESETS[0].id); // Usually e.g. 3x + 5 = 14
    
    // An invalid move, typically clicking the variable or something nested
    // We'll just click an arbitrary node id that is likely not peelable or valid
    const currentEq = useGameStore.getState().equation!;
    
    // The target variable node is never peelable directly at the start of a level 1
    // Let's find the variable node id
    let varNodeId = '';
    const findVar = (node: any) => {
      if (node.type === 'variable') varNodeId = node.id;
      if (node.left) findVar(node.left);
      if (node.right) findVar(node.right);
      if (node.inner) findVar(node.inner);
      if (node.numerator) { findVar(node.numerator); findVar(node.denominator); }
    };
    findVar(currentEq.lhs);
    
    store.handleNodeClick(varNodeId);
    
    const stateAfterClick = useGameStore.getState();
    expect(stateAfterClick.invalidClicksCount).toBeGreaterThan(0);
    expect(stateAfterClick.feedback?.type).toBe('error');
    expect(stateAfterClick.activeSelectedNodeId).toBeNull();
  });
  
  it('simulates undo and redo actions', () => {
    const store = useGameStore.getState();
    store.loadPreset(LEVEL_PRESETS[0].id);
    
    // To simulate a valid move, we need to find the peelable node
    const currentEq = useGameStore.getState().equation!;

    const peelables = getPeelableNodes(currentEq.lhs, currentEq.targetVariable);
    
    expect(peelables.length).toBeGreaterThan(0);
    const activeInfo = peelables[0];
    
    if (activeInfo) {
      store.handleNodeClick(activeInfo.nodeId);
      store.submitInverseOp(activeInfo.requiredInverseOp);
      
      const stateAfterMove = useGameStore.getState();
      expect(stateAfterMove.history.length).toBe(2);
      expect(stateAfterMove.historyIndex).toBe(1);
      
      // Undo
      store.undo();
      const stateAfterUndo = useGameStore.getState();
      expect(stateAfterUndo.historyIndex).toBe(0);
      
      // Redo
      store.redo();
      const stateAfterRedo = useGameStore.getState();
      expect(stateAfterRedo.historyIndex).toBe(1);
    }
  });

  it('can reset current equation', () => {
    const store = useGameStore.getState();
    store.loadPreset(LEVEL_PRESETS[0].id);
    
    const currentEq = useGameStore.getState().equation!;

    const peelables = getPeelableNodes(currentEq.lhs, currentEq.targetVariable);
    const activeInfo = peelables[0];
    
    if (activeInfo) {
      store.handleNodeClick(activeInfo.nodeId);
      store.submitInverseOp(activeInfo.requiredInverseOp);
    }
    
    expect(useGameStore.getState().historyIndex).toBeGreaterThan(0);
    
    store.resetCurrentEquation();
    expect(useGameStore.getState().historyIndex).toBe(0);
    expect(useGameStore.getState().invalidClicksCount).toBe(0);
    expect(useGameStore.getState().hintsUsedCount).toBe(0);
  });
});
