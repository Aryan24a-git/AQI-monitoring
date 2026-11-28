'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Edit3, AlertTriangle, RefreshCw } from 'lucide-react';

const QUICK_CITIES = ['Delhi', 'Lucknow', 'Patna', 'Kolkata', 'Mumbai', 'Bengaluru', 'Jaipur'];

interface LandingEmptyStateProps {
  isLoading: boolean;
  error: string | null;
  lastCityQuery: string | null;
  onFetchCity: (city: string) => Promise<void>;
  onUseGeolocation: () => void | Promise<void>;
  onManualPm25: (pm25: number) => void;
}

function LoadingSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading live air quality"
      className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 animate-pulse"
    >
      <div className="h-6 w-56 bg-stone-200 rounded-lg" />
      <div className="h-24 bg-stone-100 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">
        <div className="h-14 bg-stone-100 rounded-xl" />
        <div className="h-14 bg-stone-100 rounded-xl" />
        <div className="h-14 bg-stone-100 rounded-xl" />
        <div className="h-14 bg-stone-100 rounded-xl" />
      </div>
    </section>
  );
}

interface ErrorAlertProps {
  error: string;
  lastCityQuery: string | null;
  onRetry: (c: string) => void;
  onOpenManual: () => void;
}

function ErrorAlert({ error, lastCityQuery, onRetry, onOpenManual }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900"
    >
      <span className="flex items-center gap-2 font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {error}
      </span>
      <div className="flex items-center gap-2">
        {lastCityQuery && (
          <button
            type="button"
            onClick={() => onRetry(lastCityQuery)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-700 text-white font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
        <button
          type="button"
          onClick={onOpenManual}
          className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-semibold text-amber-900"
        >
          Enter AQI manually
        </button>
      </div>
    </div>
  );
}

function ManualPmForm({ onManualPm25 }: { onManualPm25: (pm25: number) => void }) {
  const [manualPm, setManualPm] = useState('180');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const val = Number(manualPm);
        if (Number.isFinite(val) && val > 0) onManualPm25(val);
      }}
      className="flex flex-wrap items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200"
    >
      <label htmlFor="manual-pm25" className="text-xs font-semibold text-slate-700">
        PM2.5 (µg/m³):
      </label>
      <input
        id="manual-pm25"
        type="number"
        min={1}
        max={1000}
        value={manualPm}
        onChange={(e) => setManualPm(e.target.value)}
        className="w-28 px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
      />
      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
      >
        Apply Manual Reading
      </button>
    </form>
  );
}

interface CitySearchBarProps {
  onSubmit: (city: string) => void;
  onUseGeolocation: () => void;
}

function CitySearchBar({ onSubmit, onUseGeolocation }: CitySearchBarProps) {
  const [query, setQuery] = useState('');
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSubmit(query.trim());
  };
  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5">
      <div className="relative flex-1">
        <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          aria-label="Search city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Indian city (e.g. Delhi, Lucknow, Patna)..."
          className="w-full pl-10 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
        />
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition"
      >
        Check Live Air
      </button>
      <button
        type="button"
        onClick={onUseGeolocation}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-sm font-semibold transition"
      >
        <Navigation className="w-4 h-4" />
        <span>Use my location</span>
      </button>
    </form>
  );
}

function QuickCityRow({ onFetchCity }: { onFetchCity: (city: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-600 mr-1">Quick cities:</span>
      {QUICK_CITIES.map((city) => (
        <button
          key={city}
          type="button"
          onClick={() => onFetchCity(city)}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition"
        >
          {city}
        </button>
      ))}
    </div>
  );
}

function LandingHeading() {
  return (
    <div className="space-y-1">
      <h2 className="font-bold text-xl text-slate-900">
        Check live winter air quality for your city
      </h2>
      <p className="text-sm text-slate-600">
        Search any Indian city to fetch live WAQI station air quality &amp; 24-hour dispersion data,
        or use your approximate location.
      </p>
    </div>
  );
}

function ManualEntrySection({
  showManual,
  onToggle,
  onManualPm25,
}: {
  showManual: boolean;
  onToggle: () => void;
  onManualPm25: (pm25: number) => void;
}) {
  return (
    <>
      <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-4 text-xs">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-teal-800"
        >
          <Edit3 className="w-3.5 h-3.5" /> Enter AQI manually
        </button>
      </div>
      {showManual && <ManualPmForm onManualPm25={onManualPm25} />}
    </>
  );
}

/** Empty-state city search, geolocation, and manual PM2.5 entry card. */
export function LandingEmptyState({
  isLoading,
  error,
  lastCityQuery,
  onFetchCity,
  onUseGeolocation,
  onManualPm25,
}: LandingEmptyStateProps) {
  const [showManual, setShowManual] = useState(false);
  if (isLoading) return <LoadingSkeleton />;

  return (
    <section
      aria-label="Select your city for live air quality"
      className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5"
    >
      <LandingHeading />
      {error && (
        <ErrorAlert
          error={error}
          lastCityQuery={lastCityQuery}
          onRetry={(c) => void onFetchCity(c)}
          onOpenManual={() => setShowManual(true)}
        />
      )}
      <CitySearchBar
        onSubmit={(c) => void onFetchCity(c)}
        onUseGeolocation={() => void onUseGeolocation()}
      />
      <QuickCityRow onFetchCity={(c) => void onFetchCity(c)} />
      <ManualEntrySection
        showManual={showManual}
        onToggle={() => setShowManual((v) => !v)}
        onManualPm25={onManualPm25}
      />
    </section>
  );
}
