'use client';

import React, { useState, useRef, useCallback } from 'react';
import { DoorOpen, Sparkles } from 'lucide-react';
import type { LocationScenario } from '@/domain/scenarios';
import { type VentilationWindow, formatHour12 } from '@/domain/naqi';
import { CHART_W, PAD_L, PAD_R } from './chartCoordinates';
import { DispersionChartSvg } from './DispersionChartSvg';
import { VentilationCallouts } from './VentilationCallouts';

interface DispersionChartProps {
  location: LocationScenario;
  vent: VentilationWindow | null;
  bandColor: string;
}

function UnavailableChartCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col justify-center items-center text-center min-h-[260px]">
      <h3 className="font-bold text-base text-slate-900">Hourly forecast unavailable</h3>
      <p className="text-xs text-slate-600 mt-1.5 max-w-md leading-relaxed">
        A complete 24-hour pollutant and wind series was not provided for this reading, so the
        dispersion chart and ventilation window are hidden. Your current NAQI reading and daily
        playbook remain active.
      </p>
    </div>
  );
}

function HourStatusBar({
  activeHour,
  vent,
  pmValue,
  windValue,
}: {
  activeHour: number;
  vent: VentilationWindow;
  pmValue: number;
  windValue: number;
}) {
  const isSafeSlot = activeHour >= vent.startHour && activeHour < vent.endHour;
  return (
    <div className="flex items-center justify-between bg-stone-50 border border-stone-200/90 rounded-xl px-3.5 py-2 mb-2 text-xs">
      <div className="flex items-center gap-2.5">
        <span className="font-bold text-slate-900 text-sm">{formatHour12(activeHour)}</span>
        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${isSafeSlot ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-slate-700'}`}
        >
          {isSafeSlot ? 'Optimal Safe Ventilation' : 'Keep Windows Sealed'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-slate-700">
        <span>
          PM2.5: <strong className="text-slate-900">{pmValue} µg/m³</strong>
        </span>
        <span>
          Wind: <strong className="text-sky-700">{windValue} km/h</strong>
        </span>
      </div>
    </div>
  );
}

function JumpButtons({
  vent,
  activeHour,
  onSelect,
}: {
  vent: VentilationWindow;
  activeHour: number;
  onSelect: (h: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-2 pb-1 overflow-x-auto no-scrollbar">
      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider shrink-0">
        Jump:
      </span>
      {[6, 9, vent.startHour, vent.sealHour, 21].map((hr) => (
        <button
          key={hr}
          type="button"
          onClick={() => onSelect(hr)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${activeHour === hr ? 'bg-teal-700 text-white shadow-xs' : 'bg-stone-100 hover:bg-stone-200 text-slate-700'}`}
        >
          {formatHour12(hr)}{' '}
          {hr === vent.startHour ? '🌿 Vent' : hr === vent.sealHour ? '🔒 Seal' : ''}
        </button>
      ))}
    </div>
  );
}

function ChartHeader({
  isSynthetic,
  windowLabel,
  onJumpToWindow,
}: {
  isSynthetic?: boolean;
  windowLabel: string;
  onJumpToWindow: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-slate-900">
            24-Hour Thermal Inversion &amp; Ventilation Curve
          </h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            <Sparkles className="w-3 h-3" /> Interactive
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-0.5">
          {isSynthetic
            ? 'Simulated 24-hour curve for demo scenario.'
            : 'Hourly forecast: model (Open-Meteo). Hover or scrub across any hour to inspect particulate buildup.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onJumpToWindow}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0 transition"
      >
        <DoorOpen className="w-4 h-4" />
        <span>Open: {windowLabel}</span>
      </button>
    </div>
  );
}

function useChartScrubbing(initialHour: number) {
  const [activeHour, setActiveHour] = useState<number>(initialHour);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const rawHour = Math.round(((relX * CHART_W - PAD_L) / (CHART_W - PAD_L - PAD_R)) * 23);
    setActiveHour(Math.min(23, Math.max(0, rawHour)));
    setIsHovering(true);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActiveHour((h) => Math.min(23, h + 1));
    else if (e.key === 'ArrowLeft') setActiveHour((h) => Math.max(0, h - 1));
  };

  return {
    activeHour,
    setActiveHour,
    isHovering,
    setIsHovering,
    svgRef,
    handlePointer,
    handleKeyDown,
  };
}

function hasChartData(
  location: LocationScenario,
  vent: VentilationWindow | null
): vent is VentilationWindow {
  return Boolean(
    vent &&
    !location.hourlyError &&
    location.hourlyPM25.length >= 24 &&
    location.hourlyWind.length >= 24
  );
}

/** Interactive 24-hour PM2.5 and wind dispersion chart with keyboard & pointer scrubbing. */
export function DispersionChart({ location, vent, bandColor }: DispersionChartProps) {
  const scrub = useChartScrubbing(vent?.startHour ?? 12);
  if (!hasChartData(location, vent)) return <UnavailableChartCard />;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col justify-between">
      <ChartHeader
        isSynthetic={location.isSynthetic}
        windowLabel={vent.windowLabel}
        onJumpToWindow={() => scrub.setActiveHour(vent.startHour)}
      />
      <HourStatusBar
        activeHour={scrub.activeHour}
        vent={vent}
        pmValue={location.hourlyPM25[scrub.activeHour]}
        windValue={location.hourlyWind[scrub.activeHour]}
      />
      <div
        role="region"
        className="relative w-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-xl"
        tabIndex={0}
        onKeyDown={scrub.handleKeyDown}
        aria-label="24-hour smog dispersion chart. Use left and right arrow keys to step."
      >
        <DispersionChartSvg
          pmData={location.hourlyPM25}
          windData={location.hourlyWind}
          vent={vent}
          bandColor={bandColor}
          {...scrub}
          onPointer={scrub.handlePointer}
          onHoverChange={scrub.setIsHovering}
        />
      </div>
      <JumpButtons vent={vent} activeHour={scrub.activeHour} onSelect={scrub.setActiveHour} />
      <VentilationCallouts vent={vent} />
    </div>
  );
}
