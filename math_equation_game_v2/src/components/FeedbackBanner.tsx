import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { CheckCircle2, AlertCircle, Lightbulb, Info, X } from 'lucide-react';

export const FeedbackBanner: React.FC = () => {
  const feedback = useGameStore(state => state.feedback);
  const dismissFeedback = useGameStore(state => state.dismissFeedback);

  if (!feedback) return null;

  const config = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
      testid: 'success-feedback-toast'
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
      testid: 'error-feedback-toast'
    },
    hint: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      testid: 'hint-feedback-toast'
    },
    info: {
      bg: 'bg-sky-50 border-sky-200 text-sky-900',
      icon: <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />,
      testid: 'info-feedback-toast'
    }
  }[feedback.type];

  return (
    <div
      data-testid={config.testid}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${config.bg} shadow-sm max-w-2xl w-full my-2 transition-all animate-bounce-short`}
      role="status"
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <p className="font-body text-sm font-medium leading-relaxed">{feedback.message}</p>
      </div>
      <button
        type="button"
        onClick={dismissFeedback}
        className="p-1 hover:bg-black/5 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Dismiss feedback"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
