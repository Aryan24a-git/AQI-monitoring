'use client';

import React, { useState } from 'react';
import { Calculator, CloudOff, Fuel, Trees } from 'lucide-react';
import type { HouseholdProfile } from '@/domain/scenarios';
import {
  CO2_PER_KM,
  DEFAULT_COMMUTE_KM,
  NOX_PER_KM,
  PETROL_CO2_PER_LITRE,
  WEEKS_PER_MONTH,
  simulateColonyImpact,
} from '@/domain/emissions';

interface ColonySimulatorProps {
  profile: HouseholdProfile;
}

function SimulatorSliders({
  families,
  daysPerWeek,
  onFamiliesChange,
  onDaysChange,
}: {
  families: number;
  daysPerWeek: number;
  onFamiliesChange: (n: number) => void;
  onDaysChange: (n: number) => void;
}) {
  return (
    <div className="space-y-4 bg-stone-50 rounded-2xl p-4 border border-stone-200/80">
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          <label htmlFor="sim-families">Participating Families in Society</label>
          <span className="px-2.5 py-0.5 rounded-lg bg-teal-700 text-white font-bold">
            {families} families
          </span>
        </div>
        <input
          id="sim-families"
          type="range"
          min="10"
          max="500"
          step="10"
          value={families}
          onChange={(e) => onFamiliesChange(Number(e.target.value))}
          className="w-full cursor-pointer accent-teal-700"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>10 families</span>
          <span>250 families</span>
          <span>500 families</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          <label htmlFor="sim-days">Low-Emission Commute Days / Week</label>
          <span className="px-2.5 py-0.5 rounded-lg bg-teal-700 text-white font-bold">
            {daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'} / week
          </span>
        </div>
        <input
          id="sim-days"
          type="range"
          min="1"
          max="7"
          step="1"
          value={daysPerWeek}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="w-full cursor-pointer accent-teal-700"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>1 day</span>
          <span>4 days</span>
          <span>7 days</span>
        </div>
      </div>
    </div>
  );
}

function SimulatorMetrics({
  co2SavedKg,
  petrolSavedL,
  treesEquiv,
}: {
  co2SavedKg: number;
  petrolSavedL: number;
  treesEquiv: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="rounded-xl bg-sky-50 border border-sky-200/80 p-3 text-center">
        <CloudOff className="w-4 h-4 text-sky-700 mx-auto mb-1" />
        <div className="font-extrabold text-lg sm:text-xl text-sky-900">
          {co2SavedKg.toLocaleString('en-IN')} kg
        </div>
        <div className="text-[11px] text-sky-800 font-medium">CO₂ Saved / mo</div>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-center">
        <Fuel className="w-4 h-4 text-amber-700 mx-auto mb-1" />
        <div className="font-extrabold text-lg sm:text-xl text-amber-900">
          {petrolSavedL.toLocaleString('en-IN')} L
        </div>
        <div className="text-[11px] text-amber-800 font-medium">Petrol Saved / mo</div>
      </div>
      <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3 text-center">
        <Trees className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
        <div className="font-extrabold text-lg sm:text-xl text-emerald-900">
          {treesEquiv.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-emerald-800 font-medium">Trees / mo equiv.</div>
      </div>
    </div>
  );
}

export function ColonySimulator({ profile }: ColonySimulatorProps) {
  const [families, setFamilies] = useState(120);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const avgKm =
    profile.commuteMode === 'wfh' ? 14 : Number(profile.commuteKm ?? DEFAULT_COMMUTE_KM.value);
  const sim = simulateColonyImpact(families, daysPerWeek, avgKm);
  const noxKg = (sim.monthlyNoxGrams / 1000).toFixed(1);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Colony Collective Impact Simulator
            </h3>
            <p className="text-[11px] text-slate-600">
              Rough estimate when neighbours coordinate commute swaps for 1 winter month
            </p>
          </div>
        </div>
        <SimulatorSliders
          families={families}
          daysPerWeek={daysPerWeek}
          onFamiliesChange={setFamilies}
          onDaysChange={setDaysPerWeek}
        />
        <SimulatorMetrics
          co2SavedKg={sim.monthlyCo2Kg}
          petrolSavedL={sim.monthlyPetrolLitres}
          treesEquiv={sim.monthlyTreesEquiv}
        />
      </div>
      <details className="rounded-xl bg-stone-50 border border-stone-200/70 px-3 py-2 text-[11px] text-slate-700">
        <summary className="font-semibold text-slate-900 cursor-pointer">
          How we estimate this (rough estimate)
        </summary>
        <p className="mt-1.5 leading-relaxed">
          Based on an average <strong className="font-semibold">{avgKm} km</strong> daily
          round-trip, if <strong className="font-semibold">{families} families</strong> shift to
          Metro/Bus or carpooling <strong className="font-semibold">{daysPerWeek} days/week</strong>{' '}
          ({WEEKS_PER_MONTH.value} weeks/mo, ~{CO2_PER_KM.value.solo_car} kg CO₂/km car vs transit,{' '}
          {PETROL_CO2_PER_LITRE.value} kg CO₂/L petrol, {NOX_PER_KM.value.solo_car} g NOx/km), your
          society prevents{' '}
          <strong className="font-semibold">
            {(sim.monthlyCo2Kg / 1000).toFixed(2)} tonnes CO₂
          </strong>{' '}
          and ~<strong className="font-semibold">{noxKg} kg</strong> NOx/month. Confidence:
          low-medium.
        </p>
      </details>
    </div>
  );
}
