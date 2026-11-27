'use client';

import React from 'react';
import { type VentilationWindow } from '@/domain/naqi';
import {
  CHART_W,
  CHART_H,
  PAD_T,
  PAD_B,
  getChartX,
  getChartY,
  buildPolylinePoints,
} from './chartCoordinates';

interface ChartSvgProps {
  pmData: number[];
  windData: number[];
  vent: VentilationWindow;
  bandColor: string;
  activeHour: number;
  isHovering: boolean;
  svgRef: React.RefObject<SVGSVGElement>;
  onPointer: (e: React.PointerEvent<SVGSVGElement>) => void;
  onHoverChange: (v: boolean) => void;
}

export function DispersionChartSvg({
  pmData,
  windData,
  vent,
  bandColor,
  activeHour,
  isHovering,
  svgRef,
  onPointer,
  onHoverChange,
}: ChartSvgProps) {
  const maxPM = Math.max(...pmData, 100);
  const maxWind = Math.max(...windData, 15);
  const pmPoints = buildPolylinePoints(pmData, maxPM);
  const windPoints = buildPolylinePoints(windData, maxWind);
  const pmArea = `${getChartX(0)},${CHART_H - PAD_B} ${pmPoints} ${getChartX(23)},${CHART_H - PAD_B}`;
  const curX = getChartX(activeHour);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full h-48 sm:h-52 select-none cursor-crosshair touch-none"
      role="img"
      aria-label="24-hour diurnal air dispersion and NAQI variation curve"
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
    >
      <title>24-Hour Diurnal Air Dispersion and NAQI Variation</title>
      <desc>
        Shows hourly PM2.5 particulate levels, wind speed, and the optimal ventilation window
      </desc>
      <defs>
        <linearGradient id="pmGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bandColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={bandColor} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect
        x={getChartX(vent.startHour)}
        y={PAD_T}
        width={getChartX(vent.endHour) - getChartX(vent.startHour)}
        height={CHART_H - PAD_T - PAD_B}
        fill="#10b981"
        fillOpacity="0.18"
      />
      <line
        x1={getChartX(vent.startHour)}
        y1={PAD_T}
        x2={getChartX(vent.startHour)}
        y2={CHART_H - PAD_B}
        stroke="#059669"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line
        x1={getChartX(vent.endHour)}
        y1={PAD_T}
        x2={getChartX(vent.endHour)}
        y2={CHART_H - PAD_B}
        stroke="#059669"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <polygon points={pmArea} fill="url(#pmGradient)" />
      <polyline points={pmPoints} fill="none" stroke={bandColor} strokeWidth="2.5" />
      <polyline
        points={windPoints}
        fill="none"
        stroke="#0284c7"
        strokeWidth="1.8"
        strokeDasharray="5 4"
      />
      <line
        x1={curX}
        y1={PAD_T}
        x2={curX}
        y2={CHART_H - PAD_B}
        stroke="#0f172a"
        strokeWidth={isHovering ? 2 : 1.5}
        strokeDasharray="3 3"
      />
      <circle
        cx={curX}
        cy={getChartY(pmData[activeHour], maxPM)}
        r={6}
        fill={bandColor}
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <circle
        cx={curX}
        cy={getChartY(windData[activeHour], maxWind)}
        r={5}
        fill="#0284c7"
        stroke="#ffffff"
        strokeWidth="2"
      />
      {[0, 4, 8, 12, 16, 20, 23].map((hr) => (
        <text
          key={hr}
          x={getChartX(hr)}
          y={CHART_H - 10}
          textAnchor="middle"
          fill="#334155"
          fontSize="10"
          fontWeight={activeHour === hr ? 'bold' : 'normal'}
        >
          {hr === 0 ? '12A' : hr === 12 ? '12P' : hr < 12 ? `${hr}A` : `${hr - 12}P`}
        </text>
      ))}
    </svg>
  );
}
