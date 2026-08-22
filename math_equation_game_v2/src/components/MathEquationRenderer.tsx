import React from 'react';
import { ASTNodeView } from './ASTNodeView';
import { useGameStore } from '../state/useGameStore';
import { findSimplifications } from '../engine/simplifier';
import { Sparkles } from 'lucide-react';

export const MathEquationRenderer: React.FC = () => {
  const equation = useGameStore(state => state.equation);
  const handleNodeClick = useGameStore(state => state.handleNodeClick);
  const handleSimplify = useGameStore(state => state.handleSimplify);

  if (!equation) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 font-display text-xl">
        ยังไม่ได้เลือกโจทย์ครับ! จิ้มเลือกด่านด้านบนเลยลุย!
      </div>
    );
  }

  const rhsSimplifications = findSimplifications(equation.rhs);
  const lhsSimplifications = findSimplifications(equation.lhs);
  const allSimplifications = [...rhsSimplifications, ...lhsSimplifications];

  return (
    <div className="flex flex-col items-center justify-center w-full my-6">
      {/* Central Interactive Equation Board */}
      <div
        className="relative flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-6 py-8 sm:px-12 sm:py-10 bg-white/95 rounded-3xl shadow-card border border-slate-100/80 min-h-[160px] max-w-4xl w-full"
        data-testid="equation-board"
      >
        {/* Left-Hand Side (LHS) */}
        <div className="flex items-center justify-center flex-wrap" data-testid="equation-lhs">
          <ASTNodeView node={equation.lhs} onNodeClick={handleNodeClick} />
        </div>

        {/* Equals Sign */}
        <div
          className="flex items-center justify-center px-2 sm:px-4 text-3xl sm:text-4xl font-black text-slate-800 select-none animate-pulse-subtle"
          data-testid="equals-sign"
          aria-hidden="true"
        >
          =
        </div>

        {/* Right-Hand Side (RHS) */}
        <div className="flex items-center justify-center flex-wrap" data-testid="equation-rhs">
          <ASTNodeView node={equation.rhs} onNodeClick={handleNodeClick} />
        </div>
      </div>

      {/* Simplification Opportunity Floating Pills */}
      {allSimplifications.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 animate-bounce-short">
          {allSimplifications.map(opp => (
            <button
              key={opp.nodeId}
              type="button"
              data-testid="simplify-button"
              onClick={() => handleSimplify(opp.nodeId)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-display font-semibold text-sm rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
              <span>
                ทำให้น้อยลง: <strong className="font-bold">{opp.originalText}</strong> ➔{' '}
                <strong className="font-bold">{opp.simplifiedText}</strong>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
