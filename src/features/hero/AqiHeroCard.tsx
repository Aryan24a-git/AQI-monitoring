'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import type { LocationScenario, CalculatedImpact } from '@/domain/scenarios';

interface AqiHeroCardProps {
  location: LocationScenario;
  impact: CalculatedImpact;
}

function StationAqiNote({ location }: { location: LocationScenario }) {
  if (location.stationAqi) {
    return (
      <>
        <p className="text-[11px] text-slate-700 mt-1 font-medium">
          Station AQI (US scale): <strong>{location.stationAqi.usAqi}</strong> &bull;{' '}
          {location.stationAqi.stationName}
          {location.stationAqi.distanceKm != null
            ? ` (${location.stationAqi.distanceKm} km)`
            : ''}{' '}
          &bull; {location.stationAqi.ageLabel} ({location.stationAqi.obsTime}) &bull;{' '}
          <a
            href="https://aqicn.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            WAQI
          </a>
        </p>
        {location.stationAqi.mismatchWarning && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1.5">
            {location.stationAqi.mismatchWarning}
          </p>
        )}
      </>
    );
  }
  if (location.stationFallbackNote) {
    return (
      <p className="text-[11px] text-slate-700 bg-stone-100 rounded-lg px-2 py-1 mt-1.5">
        {location.stationFallbackNote}
      </p>
    );
  }
  return null;
}

function PollutantGrid({ location }: { location: LocationScenario }) {
  const tiles = [
    { label: 'PM2.5', value: location.pm25, unit: 'µg/m³' },
    { label: 'PM10', value: location.pm10, unit: 'µg/m³' },
    { label: 'NO₂', value: location.no2, unit: 'µg/m³' },
    { label: 'Wind', value: location.wind, unit: 'km/h' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 pt-1">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 text-center"
        >
          <div className="text-[11px] text-slate-600 font-medium">{t.label}</div>
          <div className="font-bold text-sm sm:text-base text-slate-900 mt-0.5">{t.value}</div>
          <div className="text-[10px] text-slate-600 font-medium">{t.unit}</div>
        </div>
      ))}
    </div>
  );
}

function CigaretteEquivalentNote({
  cigsPerDay,
  band,
}: {
  cigsPerDay: number;
  band: CalculatedImpact['aqi']['band'];
}) {
  return (
    <div
      className="rounded-xl p-3.5 border flex items-start gap-3 transition-colors"
      style={{ backgroundColor: band.softBg, borderColor: band.border }}
    >
      <div className="p-2 rounded-lg bg-white/80 shadow-sm shrink-0">
        <Activity className="w-4 h-4 text-slate-800" />
      </div>
      <div className="text-xs leading-relaxed">
        <div className="font-bold text-slate-900">
          Unprotected Outdoor Equivalent:{' '}
          <span className="underline decoration-2">{cigsPerDay.toFixed(1)}</span> cigarettes/day
        </div>
        <p className="text-slate-600 mt-0.5">Berkeley Earth formula (PM2.5 ÷ 22). {band.note}</p>
      </div>
    </div>
  );
}

function HeroBadgeHeader({ location, dominant }: { location: LocationScenario; dominant: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${location.isSynthetic ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-slate-700'}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${location.isSynthetic ? 'bg-amber-600' : 'bg-teal-600'}`}
        />
        {location.isSynthetic ? 'Demo scenario (synthetic data)' : location.sourceLabel}
      </span>
      <span className="text-[11px] font-medium text-slate-700">Dominant: {dominant}</span>
    </div>
  );
}

export function AqiHeroCard({ location, impact }: AqiHeroCardProps) {
  const { naqi, dominant, band, cigsPerDay } = impact.aqi;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between">
      <div
        className="h-2 w-full transition-colors duration-300"
        style={{ backgroundColor: band.color }}
      />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <HeroBadgeHeader location={location} dominant={dominant} />
            <h2 className="font-bold text-xl text-slate-900 mt-1.5">{location.city}</h2>
            <p className="text-xs text-slate-600 mt-0.5">{location.subtitle}</p>
            <StationAqiNote location={location} />
          </div>
          <div className="text-right shrink-0">
            <div
              className="inline-flex flex-col items-center justify-center px-4 py-2 rounded-2xl text-white shadow-sm min-w-[92px] transition-colors duration-300"
              style={{ backgroundColor: band.color }}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold text-white">
                CPCB NAQI
              </span>
              <span className="font-extrabold text-3xl leading-none mt-0.5">{naqi}</span>
            </div>
            <div className="text-xs font-bold mt-1.5 text-center" style={{ color: band.color }}>
              {band.label}
            </div>
          </div>
        </div>
        <PollutantGrid location={location} />
        <CigaretteEquivalentNote cigsPerDay={cigsPerDay} band={band} />
      </div>
    </div>
  );
}
