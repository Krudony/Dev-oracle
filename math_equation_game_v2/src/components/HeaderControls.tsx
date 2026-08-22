import React from 'react';
import { useGameStore } from '../state/useGameStore';
import {
  RotateCcw,
  Undo2,
  Redo2,
  Lightbulb,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy
} from 'lucide-react';

export const HeaderControls: React.FC = () => {
  const equation = useGameStore(state => state.equation);
  const historyIndex = useGameStore(state => state.historyIndex);
  const history = useGameStore(state => state.history);
  const isMuted = useGameStore(state => state.isMuted);
  const score = useGameStore(state => state.score);

  const undo = useGameStore(state => state.undo);
  const redo = useGameStore(state => state.redo);
  const resetCurrentEquation = useGameStore(state => state.resetCurrentEquation);
  const requestHint = useGameStore(state => state.requestHint);
  const toggleSound = useGameStore(state => state.toggleSound);
  const setShowSandboxModal = useGameStore(state => state.setShowSandboxModal);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-5xl px-4 py-3 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 shadow-sm my-2">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-sky-500 text-white font-display text-xl shadow-sm">
          🧅
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">
            Algebra Unpacker
          </h1>
          <span className="text-[11px] font-body text-slate-400 font-medium block">
            Reverse PEMDAS Mastery (v2)
          </span>
        </div>
      </div>

      {/* Step Counter & Score */}
      <div className="flex items-center gap-4">
        {equation && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 rounded-full font-display text-xs font-semibold text-slate-700"
            data-testid="step-counter"
          >
            <span>Steps:</span>
            <strong className="text-sky-600 font-bold">{equation.stepCount}</strong>
          </div>
        )}

        <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-full font-display text-xs font-bold text-amber-700 border border-amber-200/60">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>{score} pts</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-1.5">
        {/* Undo */}
        <button
          type="button"
          data-testid="undo-button"
          onClick={undo}
          disabled={!canUndo}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all"
          title="Undo step"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          type="button"
          data-testid="redo-button"
          onClick={redo}
          disabled={!canRedo}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all"
          title="Redo step"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Reset */}
        <button
          type="button"
          data-testid="reset-button"
          onClick={resetCurrentEquation}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          title="Reset puzzle to start"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Hint */}
        <button
          type="button"
          data-testid="hint-button"
          onClick={requestHint}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl font-display font-semibold text-xs transition-all active:scale-95"
          title="Get a hint"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          <span>Hint</span>
        </button>

        {/* Custom Sandbox */}
        <button
          type="button"
          data-testid="sandbox-button"
          onClick={() => setShowSandboxModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/80 rounded-xl font-display font-semibold text-xs transition-all active:scale-95"
          title="Open custom sandbox editor"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Sandbox</span>
        </button>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
        </button>
      </div>
    </header>
  );
};
