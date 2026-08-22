import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { Star, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { serializeToInfix } from '../engine/serializer';
import { evaluateConstantTree } from '../engine/ast';

export const VictoryModal: React.FC = () => {
  const showVictoryModal = useGameStore(state => state.showVictoryModal);
  const equation = useGameStore(state => state.equation);
  const history = useGameStore(state => state.history);
  const invalidClicksCount = useGameStore(state => state.invalidClicksCount);
  const hintsUsedCount = useGameStore(state => state.hintsUsedCount);
  const nextPuzzle = useGameStore(state => state.nextPuzzle);
  const resetCurrentEquation = useGameStore(state => state.resetCurrentEquation);

  if (!showVictoryModal || !equation) return null;

  let stars = 3;
  if (invalidClicksCount >= 3 || hintsUsedCount >= 2) stars = 1;
  else if (invalidClicksCount >= 1 || hintsUsedCount >= 1) stars = 2;

  const solDisplay = serializeToInfix(equation.rhs);
  const solRational = evaluateConstantTree(equation.rhs);
  
  let mixedStr = null;
  let decimalStr = null;
  
  if (solRational && !solRational.isInteger()) {
    const n = Math.abs(solRational.n);
    const d = Math.abs(solRational.d);
    const sign = (solRational.n < 0 || solRational.d < 0) && !(solRational.n < 0 && solRational.d < 0) ? '-' : '';
    
    const whole = Math.floor(n / d);
    const rem = n % d;
    
    if (whole > 0) {
      mixedStr = `${sign}${whole} ${rem}/${d}`;
    }
    
    let decimal = n / d;
    if (sign === '-') decimal = -decimal;
    
    let strDec = decimal.toFixed(4);
    if (strDec.endsWith('0')) strDec = parseFloat(strDec).toString();
    
    // Check if it's repeating, usually .3333, .6666
    if (strDec.includes('.3333')) strDec = strDec.replace('.3333', '.333...');
    if (strDec.includes('.6666')) strDec = strDec.replace('.6666', '.666...');
    if (strDec.includes('.1666')) strDec = strDec.replace('.1666', '.166...');
    if (strDec.includes('.8333')) strDec = strDec.replace('.8333', '.833...');
    
    decimalStr = strDec;
  }

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
          แก้โจทย์สำเร็จ! 🎉
        </h2>
        <p className="text-slate-500 font-body text-sm mb-4">
          หนูปอกหัวหอมทุกชั้นจนแยก{' '}
          <strong className="text-sky-600 font-serif italic text-lg">{equation.targetVariable}</strong>!
        </p>

        {/* Final Solution Badge */}
        <div className="w-full flex flex-col items-center px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl mb-6">
          <span className="font-serif italic text-2xl font-bold text-emerald-800">
            {equation.targetVariable} = {solDisplay}
          </span>
          
          {(mixedStr || decimalStr) && (
            <div className="mt-2 pt-2 border-t border-emerald-200/60 w-full flex flex-col items-center gap-1">
              <span className="text-xs text-emerald-600 font-display">หรือเท่ากับ</span>
              {mixedStr && (
                <span className="text-emerald-700 font-serif font-semibold text-sm">
                  เศษส่วนคละ: {mixedStr}
                </span>
              )}
              {decimalStr && (
                <span className="text-emerald-700 font-serif font-semibold text-sm">
                  ทศนิยม: ≈ {decimalStr}
                </span>
              )}
            </div>
          )}
        </div>

        
        {/* Solution Recap */}
        <div className="w-full mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-bold font-display text-slate-700 mb-2">ทบทวนขั้นตอน (Solution Recap)</h3>
          <div className="flex flex-col gap-2 text-left">
            {history.map((eq, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-serif border-b border-slate-100 pb-1 last:border-0">
                <span className="w-6 text-xs text-slate-400 font-display">#{i}</span>
                <span>{serializeToInfix(eq.lhs)} = {serializeToInfix(eq.rhs)}</span>
              </div>
            ))}
          </div>
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
            <span className="block text-slate-400">จำนวนก้าวที่ใช้</span>
            <span className="text-base font-bold text-slate-800">{equation.stepCount}</span>
          </div>
          <div>
            <span className="block text-slate-400">ระดับฝีมือ</span>
            <span className="text-base font-bold text-amber-600">
              {stars === 3 ? 'เซียนปอกหัวหอม!' : stars === 2 ? 'เก่งมาก!' : 'ผ่านแล้ว!'}
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
            <span>เล่นอีกรอบ</span>
          </button>
          <button
            type="button"
            onClick={nextPuzzle}
            className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-display font-bold shadow-md hover:shadow-lg transition-all"
          >
            <span>โจทย์ต่อไป</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
