import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { calculateCPCBNAQI, type VentilationWindow } from '@/domain/naqi';

interface VentilationCalloutsProps {
  vent: VentilationWindow;
}

/** Ventilation callouts. */
export function VentilationCallouts({ vent }: VentilationCalloutsProps) {
  const highWarning =
    vent.avgWindowPM > 60
      ? ` Even the cleanest hours are still ${calculateCPCBNAQI(vent.avgWindowPM).band.label}: ventilate briefly or not at all.`
      : '';
  return (
    <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
      <div className="flex items-start gap-2 bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-emerald-800">
          <strong className="text-emerald-900">Best window to ventilate: </strong>
          Least-polluted window {vent.windowLabel} (~{vent.avgWindowPM} µg/m³ outdoor PM2.5).
          {highWarning}
        </p>
      </div>
      <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5">
        <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="text-amber-800">
          <strong className="text-amber-900">Seal Windows Shut: </strong>
          Close by {vent.sealLabel} before evening thermal inversion.
        </p>
      </div>
    </div>
  );
}
