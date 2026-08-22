import React, { useEffect, useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { HeaderControls } from './HeaderControls';
import { LevelSelector } from './LevelSelector';
import { OnionTracker } from './OnionTracker';
import { FeedbackBanner } from './FeedbackBanner';
import { MathEquationRenderer } from './MathEquationRenderer';
import { InverseOpModal } from './InverseOpModal';
import { VictoryModal } from './VictoryModal';
import { SandboxModal } from './SandboxModal';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

export const GameView: React.FC = () => {
  const equation = useGameStore(state => state.equation);
  const loadPreset = useGameStore(state => state.loadPreset);
  const stepDescriptions = useGameStore(state => state.stepDescriptions);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Initial puzzle load
    if (!equation) {
      loadPreset('preset_1_1');
    }
  }, [equation, loadPreset]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full px-3 py-4 sm:px-6 bg-[#F8FAFC]">
      {/* Top Header & Global Controls */}
      <HeaderControls />

      {/* Campaign Difficulty & Preset Selector */}
      <LevelSelector />

      {/* Main Board Container */}
      <main className="flex flex-col items-center w-full max-w-4xl my-2">
        {/* Onion Progress Tracker */}
        <OnionTracker />

        {/* Dynamic Instructional / Error Feedback Banner */}
        <FeedbackBanner />

        {/* Central Vertical Math Canvas */}
        <MathEquationRenderer />

        {/* Step History Accordion */}
        {stepDescriptions.length > 0 && (
          <div className="w-full max-w-2xl mt-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-3 shadow-subtle">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full font-display font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors px-2 py-1"
            >
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-600" />
                <span>Move History ({stepDescriptions.length} actions)</span>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHistory && (
              <ol className="mt-2 space-y-1.5 max-h-48 overflow-y-auto px-2 py-1 border-t border-slate-100 text-xs font-body text-slate-600 list-decimal list-inside">
                {stepDescriptions.map((desc, idx) => (
                  <li key={idx} className="py-0.5 leading-relaxed">
                    {desc}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </main>

      {/* Active Modals */}
      <InverseOpModal />
      <VictoryModal />
      <SandboxModal />
    </div>
  );
};
