'use client';

import React from 'react';
import { Activity, Sparkles, Loader2 } from 'lucide-react';
import type { CalculatedImpact } from '@/domain/scenarios';
import type { PlaybookData } from '@/domain/playbookEngine';

interface ImpactMeterProps {
  playbook: PlaybookData;
  impact: CalculatedImpact;
  completedIds: string[];
  playbookSource: 'ai' | 'basic';
  isGeneratingAI: boolean;
  onGenerateAI: () => void;
}

function computeEarned(playbook: PlaybookData, impact: CalculatedImpact, completedIds: string[]) {
  const allItems = [...playbook.iaqHacks, ...playbook.emissionSwaps];
  const completed = allItems.filter((i) => completedIds.includes(i.id));
  const totalCount = allItems.length;
  const doneCount = completed.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const earnedExposure = Math.min(
    impact.maxExposureDropPct,
    completed.reduce((sum, item) => sum + (Number(item.exposurePct) || 0), 0)
  );
  const earnedCigs = Number(((impact.aqi.cigsPerDay * earnedExposure) / 100).toFixed(1));
  const earnedCo2 = Number(
    completed.reduce((sum, item) => sum + (Number(item.co2Kg) || 0), 0).toFixed(2)
  );
  return { totalCount, doneCount, pct, earnedExposure, earnedCigs, earnedCo2 };
}

function MetricTile({
  label,
  value,
  suffix,
  colorClass,
}: {
  label: string;
  value: string;
  suffix: string;
  colorClass: string;
}) {
  return (
    <div className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-200/70">
      <div className="text-[11px] text-slate-600 font-medium">{label}</div>
      <div className={`font-bold text-sm sm:text-base ${colorClass}`}>
        <span>{value}</span>
        <span className="text-[11px] font-medium text-slate-600">{suffix}</span>
      </div>
    </div>
  );
}

function SourceBadge({
  playbookSource,
  generatedAt,
}: {
  playbookSource: 'ai' | 'basic';
  generatedAt?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
        playbookSource === 'ai'
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          : 'bg-stone-100 text-slate-600 border border-stone-200'
      }`}
    >
      {playbookSource === 'ai' && <Sparkles className="w-3 h-3 text-indigo-600" />}
      {playbookSource === 'ai'
        ? `AI Grounded${generatedAt ? ` · ${generatedAt}` : ''}`
        : 'Basic mode'}
    </span>
  );
}

function GenerateAiButton({
  isGeneratingAI,
  onGenerateAI,
}: {
  isGeneratingAI: boolean;
  onGenerateAI: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGenerateAI}
      disabled={isGeneratingAI}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
    >
      {isGeneratingAI ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      <span>{isGeneratingAI ? 'Personalizing...' : 'Generate Fresh AI Playbook'}</span>
    </button>
  );
}

export function ImpactMeter({
  playbook,
  impact,
  completedIds,
  playbookSource,
  isGeneratingAI,
  onGenerateAI,
}: ImpactMeterProps) {
  const { totalCount, doneCount, pct, earnedExposure, earnedCigs, earnedCo2 } = computeEarned(
    playbook,
    impact,
    completedIds
  );
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-100 text-teal-800">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-slate-900">Today’s Live Impact Meter</h3>
              <SourceBadge playbookSource={playbookSource} generatedAt={playbook.generatedAt} />
            </div>
            <span className="text-xs font-bold text-teal-800">
              {doneCount} / {totalCount} actions completed today
            </span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200/70">
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
            <MetricTile
              label="Exposure Cut (rough estimate)"
              value={`${earnedExposure}%`}
              suffix={` / ${impact.maxExposureDropPct}%`}
              colorClass="text-teal-800"
            />
            <MetricTile
              label="Cigs Avoided (rough estimate)"
              value={earnedCigs.toFixed(1)}
              suffix=" today"
              colorClass="text-emerald-800"
            />
            <MetricTile
              label="CO₂ Saved (rough estimate)"
              value={earnedCo2.toFixed(2)}
              suffix=" kg"
              colorClass="text-sky-800"
            />
          </div>
        </div>
        <GenerateAiButton isGeneratingAI={isGeneratingAI} onGenerateAI={onGenerateAI} />
      </div>
    </div>
  );
}
