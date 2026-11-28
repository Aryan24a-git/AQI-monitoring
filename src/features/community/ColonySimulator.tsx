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

interface SliderControlProps {
  id: string;
  label: string;
  badge: string;
  min: number;
  max: number;
  step: number;
  value: number;
  marks: [string, string, string];
  onChange: (n: number) => void;
}

function SliderControl({
  id,
  label,
  badge,
  min,
  max,
  step,
  value,
  marks,
  onChange,
}: SliderControlProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
        <label htmlFor={id}>{label}</label>
        <span className="px-2.5 py-0.5 rounded-lg bg-teal-700 text-white font-bold">{badge}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-teal-700"
      />
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>{marks[0]}</span>
        <span>{marks[1]}</span>
        <span>{marks[2]}</span>
      </div>
    </div>
  );
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
      <SliderControl
        id="sim-families"
        label="Participating Families in Society"
        badge={`${families} families`}
        min={10}
        max={500}
        step={10}
        value={families}
        marks={['10 families', '250 families', '500 families']}
        onChange={onFamiliesChange}
      />
      <SliderControl
        id="sim-days"
        label="Low-Emission Commute Days / Week"
        badge={`${daysPerWeek} ${daysPerWeek === 1 ? 'day' : 'days'} / week`}
        min={1}
        max={7}
        step={1}
        value={daysPerWeek}
        marks={['1 day', '4 days', '7 days']}
        onChange={onDaysChange}
      />
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

function ColonyEstimateDetails({
  avgKm,
  families,
  daysPerWeek,
  monthlyCo2Kg,
  noxKg,
}: {
  avgKm: number;
  families: number;
  daysPerWeek: number;
  monthlyCo2Kg: number;
  noxKg: string;
}) {
  return (
    <details className="rounded-xl bg-stone-50 border border-stone-200/70 px-3 py-2 text-[11px] text-slate-700">
      <summary className="font-semibold text-slate-900 cursor-pointer">
        How we estimate this (rough estimate)
      </summary>
      <p className="mt-1.5 leading-relaxed">
        Based on an average <strong className="font-semibold">{avgKm} km</strong> daily round-trip,
        if <strong className="font-semibold">{families} families</strong> shift to Metro/Bus or
        carpooling <strong className="font-semibold">{daysPerWeek} days/week</strong> (
        {WEEKS_PER_MONTH.value} weeks/mo, ~{CO2_PER_KM.value.solo_car} kg CO₂/km car vs transit,{' '}
        {PETROL_CO2_PER_LITRE.value} kg CO₂/L petrol, {NOX_PER_KM.value.solo_car} g NOx/km), your
        society prevents{' '}
        <strong className="font-semibold">{(monthlyCo2Kg / 1000).toFixed(2)} tonnes CO₂</strong> and
        ~<strong className="font-semibold">{noxKg} kg</strong> NOx/month. Confidence: low-medium.
      </p>
    </details>
  );
}

function SimulatorHeader() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
        <Calculator className="w-4 h-4" />
      </div>
      <div>
        <h3 className="font-bold text-base text-slate-900">Colony Collective Impact Simulator</h3>
        <p className="text-[11px] text-slate-600">
          Rough estimate when neighbours coordinate commute swaps for 1 winter month
        </p>
      </div>
    </div>
  );
}

/** Interactive colony-level commute-swap impact simulator. */
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
        <SimulatorHeader />
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
      <ColonyEstimateDetails
        avgKm={avgKm}
        families={families}
        daysPerWeek={daysPerWeek}
        monthlyCo2Kg={sim.monthlyCo2Kg}
        noxKg={noxKg}
      />
    </div>
  );
}
