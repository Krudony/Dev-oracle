import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { countGroupingDepth } from '../engine/ast';
import { Target, Layers, CheckCircle } from 'lucide-react';

export const OnionTracker: React.FC = () => {
  const equation = useGameStore(state => state.equation);

  if (!equation) return null;

  const currentDepth = countGroupingDepth(equation.lhs);
  const targetVar = equation.targetVariable;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 px-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-200/50 max-w-2xl w-full my-2 text-xs sm:text-sm font-display text-slate-600">
      <div className="flex items-center gap-1 text-sky-700 font-semibold">
        <Layers className="w-4 h-4 text-sky-600" />
        <span>ชั้นของหัวหอม:</span>
      </div>

      <div className="flex items-center gap-1.5">
        {equation.isSolved ? (
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle className="w-4 h-4 fill-emerald-100 text-emerald-600" />
            <span>ปอกหมดแล้วจ้า!</span>
          </span>
        ) : (
          <>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full font-bold text-xs">
              {currentDepth > 0 ? `${currentDepth} ชั้น` : 'ชั้นในสุดแล้ว'}
            </span>
            <span className="text-slate-300">➔</span>
            <span className="flex items-center gap-1 text-slate-700 font-bold">
              <Target className="w-3.5 h-3.5 text-rose-500" />
              <span>Isolate '{targetVar}'</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
