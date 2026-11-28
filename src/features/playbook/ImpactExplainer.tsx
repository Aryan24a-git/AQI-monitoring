'use client';

import React from 'react';
import { BarChart3, HeartPulse } from 'lucide-react';
import type { CalculatedImpact } from '@/domain/scenarios';
import type { PlaybookData } from '@/domain/playbookEngine';
import { PM25_PER_CIGARETTE } from '@/domain/emissions';

interface ImpactExplainerProps {
  playbook: PlaybookData;
  impact: CalculatedImpact;
}

function ImpactTiles({ impact }: { impact: CalculatedImpact }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-4">
      <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3">
        <div className="text-[11px] font-semibold text-emerald-900">
          Indoor PM2.5 Drop (rough estimate)
        </div>
        <div className="font-extrabold text-2xl text-emerald-900 mt-0.5">
          -{impact.maxExposureDropPct}%
        </div>
        <div className="text-[11px] text-emerald-800 mt-0.5">
          ~{impact.maxCigsAvoided} cigs/day avoided
        </div>
      </div>
      <div className="rounded-xl bg-sky-50/70 border border-sky-200/80 p-3">
        <div className="text-[11px] font-semibold text-sky-900">
          Outdoor Emissions Cut (rough estimate)
        </div>
        <div className="font-extrabold text-2xl text-sky-900 mt-0.5">{impact.totalCo2Kg} kg</div>
        <div className="text-[11px] text-sky-800 mt-0.5">
          CO₂ &amp; {impact.totalNoxG}g NOx avoided
        </div>
      </div>
    </div>
  );
}

function ImpactMethodology() {
  return (
    <details className="mb-3 rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-2 text-[11px] text-slate-700">
      <summary className="font-semibold text-slate-900 cursor-pointer">
        How we estimate this
      </summary>
      <ul className="mt-1.5 space-y-1 list-disc list-inside text-slate-700">
        <li>
          <strong>Assumption:</strong> Additive indoor infiltration &amp; source-control reductions
          capped by purifier/sealing setup.
        </li>
        <li>
          <strong>Source:</strong> Berkeley Earth cigarette equivalent (PM2.5 &divide;{' '}
          {PM25_PER_CIGARETTE.value}), CPCB NAQI breakpoints, WHO / EPA indoor filtration &amp;
          wet-cleaning studies.
        </li>
        <li>
          <strong>Confidence:</strong> Medium (varies by room volume, sealing, and outdoor wind).
        </li>
      </ul>
    </details>
  );
}

function ExplainerHeader() {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
        <BarChart3 className="w-4 h-4" />
      </div>
      <div>
        <h4 className="font-bold text-sm sm:text-base text-slate-900">Direct Impact Explainer</h4>
        <p className="text-[11px] text-slate-600">
          Rough estimate &bull; literature-based household assumptions
        </p>
      </div>
    </div>
  );
}

/** Explains personal health protection and outdoor smog prevention impact. */
export function ImpactExplainer({ playbook, impact }: ImpactExplainerProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col justify-between">
      <div>
        <ExplainerHeader />
        <ImpactTiles impact={impact} />
        <ImpactMethodology />
        <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" /> Personal Health Protection
            </div>
            <p>{playbook.explainer.healthWhy}</p>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-600" /> Outdoor Smog Prevention
            </div>
            <p>{playbook.explainer.emissionWhy}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-slate-600 flex items-start gap-2">
        <HeartPulse className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <span>{playbook.explainer.vulnerabilityNote}</span>
      </div>
    </div>
  );
}
