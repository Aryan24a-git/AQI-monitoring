'use client';

import React from 'react';
import { type VentilationWindow, formatHour12 } from '@/domain/naqi';

function TableHead() {
  return (
    <thead className="bg-stone-50 text-slate-700 sticky top-0">
      <tr>
        <th className="px-2.5 py-1.5 font-semibold">Hour</th>
        <th className="px-2.5 py-1.5 font-semibold">PM2.5 (µg/m³)</th>
        <th className="px-2.5 py-1.5 font-semibold">Wind (km/h)</th>
        <th className="px-2.5 py-1.5 font-semibold">Window</th>
      </tr>
    </thead>
  );
}

/** Collapsible 24-hour PM2.5 and wind dispersion data table for screen readers and tabular review. */
export function DispersionDataTable({
  pmData,
  windData,
  vent,
}: {
  pmData: number[];
  windData: number[];
  vent: VentilationWindow;
}) {
  return (
    <details className="mt-3 text-xs border-t border-stone-100 pt-2">
      <summary className="cursor-pointer font-semibold text-teal-800 py-2 min-h-[44px] inline-flex items-center">
        View 24-hour data table
      </summary>
      <div className="overflow-x-auto max-h-56 mt-2 rounded-lg border border-stone-200">
        <table className="w-full text-left border-collapse text-[11px]">
          <TableHead />
          <tbody className="divide-y divide-stone-100">
            {pmData.slice(0, 24).map((pm, hr) => {
              const isSafe = hr >= vent.startHour && hr < vent.endHour;
              return (
                <tr key={hr} className={isSafe ? 'bg-teal-50/50' : ''}>
                  <td className="px-2.5 py-1 font-medium">{formatHour12(hr)}</td>
                  <td className="px-2.5 py-1 tabular-nums">{pm}</td>
                  <td className="px-2.5 py-1 tabular-nums">{windData[hr]}</td>
                  <td className="px-2.5 py-1">{isSafe ? 'Safe ventilation' : 'Keep sealed'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
