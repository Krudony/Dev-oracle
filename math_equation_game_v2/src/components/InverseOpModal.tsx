import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { BinaryOperator } from '../engine/types';
import { Plus, Minus, X as TimesIcon, Divide, X } from 'lucide-react';

export const InverseOpModal: React.FC = () => {
  const activeSelectedNodeId = useGameStore(state => state.activeSelectedNodeId);
  const activePeelableInfo = useGameStore(state => state.activePeelableInfo);
  const submitInverseOp = useGameStore(state => state.submitInverseOp);
  const closeModal = useGameStore(state => state.closeModal);

  if (!activeSelectedNodeId || !activePeelableInfo) {
    return null;
  }

  const options: Array<{
    op: BinaryOperator;
    label: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      op: '+',
      label: 'Plus (+)',
      icon: <Plus className="w-6 h-6" />,
      color: 'hover:bg-blue-500 hover:text-white border-blue-200 text-blue-700 bg-blue-50'
    },
    {
      op: '-',
      label: 'Minus (-)',
      icon: <Minus className="w-6 h-6" />,
      color: 'hover:bg-rose-500 hover:text-white border-rose-200 text-rose-700 bg-rose-50'
    },
    {
      op: '*',
      label: 'Times (×)',
      icon: <TimesIcon className="w-6 h-6" />,
      color: 'hover:bg-emerald-500 hover:text-white border-emerald-200 text-emerald-700 bg-emerald-50'
    },
    {
      op: '/',
      label: 'Divide (÷)',
      icon: <Divide className="w-6 h-6" />,
      color: 'hover:bg-purple-500 hover:text-white border-purple-200 text-purple-700 bg-purple-50'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-popover border border-slate-100 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon / Badge */}
        <div className="flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-sky-100 text-sky-600 font-display text-2xl shadow-inner">
          🧅
        </div>

        <h3 className="font-display font-bold text-2xl text-slate-800 mb-1">
          Unpacking: <span className="text-sky-600 underline decoration-sky-300">{activePeelableInfo.displayLabel}</span>
        </h3>
        <p className="text-slate-500 font-body text-sm mb-6">
          What is the <strong>opposite (inverse) operation</strong> to move this across the equals sign?
        </p>

        {/* 4 Operation Choice Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {options.map(opt => (
            <button
              key={opt.op}
              type="button"
              data-testid={`inverse-op-option-${opt.op}`}
              onClick={() => submitInverseOp(opt.op)}
              className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 font-display font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-sm ${opt.color}`}
            >
              {opt.icon}
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
