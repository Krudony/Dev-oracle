import React from 'react';
import { useGameStore } from '../state/useGameStore';
import { DIFFICULTY_PROFILES } from '../generator/profiles';
import { LEVEL_PRESETS } from '../generator/presets';
import { Star, ChevronRight, Sparkles } from 'lucide-react';

export const LevelSelector: React.FC = () => {
  const currentLevel = useGameStore(state => state.currentLevel);
  const currentPresetId = useGameStore(state => state.currentPresetId);
  const loadLevel = useGameStore(state => state.loadLevel);
  const loadPreset = useGameStore(state => state.loadPreset);
  const stars = useGameStore(state => state.stars);

  const levels = [1, 2, 3, 4, 5];
  const presetsForCurrentLevel = LEVEL_PRESETS.filter(p => p.level === currentLevel);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl px-4 my-2">
      {/* 5 Difficulty Level Tabs */}
      <div
        className="flex items-center justify-center flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 w-full"
        data-testid="level-selector-tab"
      >
        {levels.map(lvl => {
          const profile = DIFFICULTY_PROFILES[lvl];
          const isActive = currentLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => loadLevel(lvl)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-display font-semibold text-xs sm:text-sm transition-all ${
                isActive
                  ? 'bg-white text-sky-700 shadow-sm border border-slate-200/80 scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {lvl}
              </span>
              <span className="hidden sm:inline">{profile.name}</span>
            </button>
          );
        })}
      </div>

      {/* Preset Chips for Current Level */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-3 w-full">
        {presetsForCurrentLevel.map((preset, idx) => {
          const isSelected = currentPresetId === preset.id;
          const starCount = stars[preset.id] || 0;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadPreset(preset.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-display font-medium transition-all ${
                isSelected
                  ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>ด่าน {idx + 1}</span>
              {starCount > 0 && (
                <span className="flex items-center text-amber-500">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span className="text-[10px] ml-0.5">{starCount}</span>
                </span>
              )}
              {isSelected && <ChevronRight className="w-3 h-3 text-sky-600" />}
            </button>
          );
        })}
        {/* Generate Random ด่าน Button */}
        <button
          type="button"
          onClick={() => useGameStore.getState().generateRandomPuzzle(currentLevel)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-display font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all ${
            currentPresetId === null
              ? 'ring-2 ring-indigo-400 font-bold shadow-sm'
              : ''
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>สุ่มโจทย์ใหม่</span>
        </button>
      </div>
    </div>
  );
};
