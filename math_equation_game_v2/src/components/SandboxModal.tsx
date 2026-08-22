import React, { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { parseEquation } from '../engine/parser';
import { solveEquation } from '../engine/solver';
import { X, Play, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SandboxModal: React.FC = () => {
  const showSandboxModal = useGameStore(state => state.showSandboxModal);
  const setShowSandboxModal = useGameStore(state => state.setShowSandboxModal);
  const loadCustomEquation = useGameStore(state => state.loadCustomEquation);

  const [inputVal, setInputVal] = useState('2[2+2{2+(2x-1)}] = 36');
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    targetVar?: string;
    solution?: string;
    stepsCount?: number;
    errorMsg?: string;
  } | null>(null);

  if (!showSandboxModal) return null;

  const handleValidate = (text: string) => {
    setInputVal(text);
    if (!text.trim()) {
      setValidationStatus(null);
      return;
    }
    try {
      const eq = parseEquation(text);
      const proof = solveEquation(eq);
      if (proof.isSolvable) {
        setValidationStatus({
          valid: true,
          targetVar: proof.targetVariable,
          solution: proof.verifiedSolution.toString(),
          stepsCount: proof.stepsCount
        });
      } else {
        setValidationStatus({
          valid: false,
          errorMsg: proof.validationErrors[0] || 'Equation could not be solved via linear Reverse PEMDAS.'
        });
      }
    } catch (e: unknown) {
      setValidationStatus({
        valid: false,
        errorMsg: e instanceof Error ? e.message : 'Invalid syntax'
      });
    }
  };

  const handlePlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const success = loadCustomEquation(inputVal.trim());
    if (success) {
      setShowSandboxModal(false);
    }
  };

  const quickExamples = [
    { label: 'Triple Bracket Onion', eq: '2[2+2{2+(2x-1)}] = 36' },
    { label: 'Integer Onion', eq: '2[2+2{2+(2x-1)}] = 32' },
    { label: 'Stacked Fraction', eq: '13(3m-7)/3 = 78/9' },
    { label: 'Curly Double Group', eq: '3{4+2(3x-5)} = 48' },
    { label: 'Linear Warmup', eq: '3x + 5 = 20' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-popover border border-slate-100 flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setShowSandboxModal(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-slate-800">
              โหมดสร้างโจทย์เอง
            </h3>
            <p className="text-xs text-slate-500 font-body">
              พิมพ์สมการที่มีวงเล็บ (), {}, [] และเศษส่วนได้เลยจ้า!
            </p>
          </div>
        </div>

        <form onSubmit={handlePlay} className="flex flex-col gap-4 my-4">
          <div>
            <label htmlFor="custom-eq-input" className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
              พิมพ์สมการตรงนี้:
            </label>
            <input
              id="custom-eq-input"
              type="text"
              data-testid="sandbox-input"
              value={inputVal}
              onChange={e => handleValidate(e.target.value)}
              placeholder="e.g. 13(3m-7)/3 = 78/9"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all shadow-inner"
            />
          </div>

          {/* Validation Status Preview */}
          {validationStatus && (
            <div
              className={`p-3 rounded-2xl border text-xs font-body flex items-start gap-2.5 ${
                validationStatus.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {validationStatus.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                {validationStatus.valid ? (
                  <div>
                    <strong>สมการถูกต้องและแก้ได้ 100%!</strong> เป้าหมายคือหา{' '}
                    <code className="font-serif italic font-bold">{validationStatus.targetVar}</code> ➔ คำตอบคือ:{' '}
                    <strong>{validationStatus.solution}</strong> ({validationStatus.stepsCount} ก้าว)
                  </div>
                ) : (
                  <div>
                    <strong>มีข้อผิดพลาด:</strong> {validationStatus.errorMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Example Presets */}
          <div>
            <span className="block text-xs font-semibold text-slate-500 mb-2 font-display">
              หรือลองเลือกจากตัวอย่าง:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickExamples.map(ex => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => handleValidate(ex.eq)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-display text-slate-700 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={validationStatus !== null && !validationStatus.valid}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 text-white font-display font-bold text-base rounded-2xl shadow-md transition-all active:scale-98 mt-2"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>เริ่มเล่นโจทย์นี้เลย!</span>
          </button>
        </form>
      </div>
    </div>
  );
};
