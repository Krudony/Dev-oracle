import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { Star, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { serializeToInfix } from '../engine/serializer';

export const VictoryModal: React.FC = () => {
  const showVictoryModal = useGameStore(state => state.showVictoryModal);
  const equation = useGameStore(state => state.equation);
  const invalidClicksCount = useGameStore(state => state.invalidClicksCount);
  const hintsUsedCount = useGameStore(state => state.hintsUsedCount);
  const nextPuzzle = useGameStore(state => state.nextPuzzle);
  const resetCurrentEquation = useGameStore(state => state.resetCurrentEquation);

  if (!showVictoryModal || !equation) return null;

  let stars = 3;
  if (invalidClicksCount >= 3 || hintsUsedCount >= 2) stars = 1;
  else if (invalidClicksCount >= 1 || hintsUsedCount >= 1) stars = 2;

  const solDisplay = serializeToInfix(equation.rhs);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-popover border border-slate-100 flex flex-col items-center text-center">
        {/* Trophy Badge */}
        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-amber-100 text-amber-600 shadow-inner">
          <Trophy className="w-9 h-9" />
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-800 mb-1">
          Puzzle Solved! 🎉
        </h2>
        <p className="text-slate-500 font-body text-sm mb-4">
          You successfully peeled every layer to isolate{' '}
          <strong className="text-sky-600 font-serif italic text-lg">{equation.targetVariable}</strong>!
        </p>

        {/* Final Solution Badge */}
        <div className="px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl mb-6">
          <span className="font-serif italic text-2xl font-bold text-emerald-800">
            {equation.targetVariable} = {solDisplay}
          </span>
        </div>

        {/* Stars Display */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <Star
              key={s}
              className={`w-8 h-8 ${
                s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'
              } transition-transform transform hover:scale-110`}
            />
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6 p-3 bg-slate-50 rounded-2xl text-xs font-display text-slate-600">
          <div>
            <span className="block text-slate-400">Steps Taken</span>
            <span className="text-base font-bold text-slate-800">{equation.stepCount}</span>
          </div>
          <div>
            <span className="block text-slate-400">Rating</span>
            <span className="text-base font-bold text-amber-600">
              {stars === 3 ? 'Master Peeler!' : stars === 2 ? 'Great Job!' : 'Solved!'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={resetCurrentEquation}
            className="flex items-center justify-center gap-1.5 flex-1 px-4 py-3 rounded-2xl border border-slate-200 font-display font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>
          <button
            type="button"
            onClick={nextPuzzle}
            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-display font-bold shadow-md hover:shadow-lg transition-all"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
