'use client';

import { useState, useCallback } from 'react';
import type { LocationScenario } from '@/domain/scenarios';
import { fetchLiveIndianCity } from './fetchLiveCity';
import { STORAGE, saveStorage } from './storage';

async function resolveCityOrError(
  cityQuery: string
): Promise<{ loc?: LocationScenario; err?: string }> {
  try {
    const newLoc = await fetchLiveIndianCity(cityQuery);
    if (!newLoc) return { err: `Could not find "${cityQuery}". Try Delhi, Lucknow, or Patna.` };
    return { loc: newLoc };
  } catch (err) {
    console.warn('Live city lookup failed', err);
    return { err: 'Live air quality provider unavailable. Retry or enter AQI manually.' };
  }
}

/** Manages live city search, loading/error state, and last-city persistence. */
export function useCityLoader(onCityLoaded: () => void) {
  const [selectedLocation, setSelectedLocation] = useState<LocationScenario | null>(null);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [lastCityQuery, setLastCityQuery] = useState<string | null>(null);

  const loadLiveCity = useCallback(
    async (cityQuery: string) => {
      setIsLoadingCity(true);
      setCityError(null);
      setLastCityQuery(cityQuery);
      const result = await resolveCityOrError(cityQuery);
      setIsLoadingCity(false);
      if (result.err || !result.loc) return setCityError(result.err ?? null);
      setSelectedLocation(result.loc);
      onCityLoaded();
      saveStorage(STORAGE.lastCity, cityQuery);
    },
    [onCityLoaded]
  );

  const resetCityState = useCallback(() => {
    setSelectedLocation(null);
    setCityError(null);
    setLastCityQuery(null);
  }, []);

  return {
    selectedLocation,
    setSelectedLocation,
    isLoadingCity,
    cityError,
    lastCityQuery,
    loadLiveCity,
    resetCityState,
  };
}
