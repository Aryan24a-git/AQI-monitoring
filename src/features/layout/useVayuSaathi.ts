'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DEFAULT_PROFILE,
  computeDeterministicImpact,
  type HouseholdProfile,
  type LocationScenario,
} from '@/domain/scenarios';
import { findSafeVentilationWindow } from '@/domain/naqi';
import { buildDeterministicPlaybook, type PlaybookData } from '@/domain/playbookEngine';
import { INITIAL_HOTSPOTS, type HotspotReport } from '@/features/community/SmogPinboard';
import type { ChatMessage } from '@/features/copilot/CopilotChat';
import { fetchLiveIndianCity } from './fetchLiveCity';
import { useToast } from './ToastContainer';

const STORAGE = {
  profile: 'vayusaathi_profile_v1',
  pledges: 'vayusaathi_pledges_v1',
  hotspots: 'vayusaathi_hotspots_v1',
  upvotes: 'vayusaathi_upvotes_v1',
  lastCity: 'vayusaathi_last_city',
};

function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // ignore
  }
}

function buildGreeting(loc: LocationScenario): ChatMessage {
  const { naqi, band } = computeDeterministicImpact(loc, DEFAULT_PROFILE).aqi;
  const hasHourly = !loc.hourlyError && loc.hourlyPM25.length >= 24 && loc.hourlyWind.length >= 24;
  const v = hasHourly ? findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind) : null;
  const slotNote = v
    ? `Your safest cross-ventilation slot today is **${v.windowLabel}**.`
    : 'Hourly forecast unavailable — limit outdoor activity during haze.';
  return {
    role: 'assistant',
    source: 'basic',
    text: `Namaste! I'm **VayuSaathi**. Right now **${loc.city}** is at **CPCB NAQI ${naqi} (${band.label})** with PM2.5 at ${loc.pm25} µg/m³.\n\n${slotNote} Ask me anything in English, Hindi, or Hinglish!`,
  };
}

function useCommunityActions() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [hotspots, setHotspots] = useState<HotspotReport[]>(INITIAL_HOTSPOTS);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);

  const togglePledge = (id: string) => {
    const next = completedIds.includes(id)
      ? completedIds.filter((x) => x !== id)
      : [...completedIds, id];
    setCompletedIds(next);
    saveStorage(STORAGE.pledges, next);
  };

  const toggleUpvote = (id: string) => {
    const isUp = upvotedIds.includes(id);
    const nextUpvotes = isUp ? upvotedIds.filter((x) => x !== id) : [...upvotedIds, id];
    setUpvotedIds(nextUpvotes);
    setHotspots((prev) =>
      prev.map((h) => (h.id === id ? { ...h, upvotes: isUp ? h.upvotes - 1 : h.upvotes + 1 } : h))
    );
    saveStorage(STORAGE.upvotes, nextUpvotes);
  };

  const addHotspot = (item: HotspotReport) => {
    const next = [item, ...hotspots];
    setHotspots(next);
    setUpvotedIds((prev) => [...prev, item.id]);
    saveStorage(STORAGE.hotspots, next);
  };

  const removeHotspot = (id: string) => {
    const next = hotspots.filter((h) => h.id !== id);
    const nextUpvotes = upvotedIds.filter((x) => x !== id);
    setHotspots(next);
    setUpvotedIds(nextUpvotes);
    saveStorage(STORAGE.hotspots, next);
    saveStorage(STORAGE.upvotes, nextUpvotes);
  };

  return {
    completedIds,
    setCompletedIds,
    hotspots,
    setHotspots,
    upvotedIds,
    setUpvotedIds,
    togglePledge,
    toggleUpvote,
    addHotspot,
    removeHotspot,
  };
}

export function useVayuSaathi() {
  const { showToast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<LocationScenario | null>(null);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [lastCityQuery, setLastCityQuery] = useState<string | null>(null);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<'playbook' | 'copilot' | 'community'>('playbook');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [playbookSource, setPlaybookSource] = useState<'ai' | 'basic'>('basic');
  const [aiPlaybook, setAiPlaybook] = useState<PlaybookData | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const community = useCommunityActions();

  const loadLiveCity = useCallback(async (cityQuery: string) => {
    setIsLoadingCity(true);
    setCityError(null);
    setLastCityQuery(cityQuery);
    try {
      const newLoc = await fetchLiveIndianCity(cityQuery);
      if (!newLoc)
        return setCityError(`Could not find "${cityQuery}". Try Delhi, Lucknow, or Patna.`);
      setSelectedLocation(newLoc);
      setAiPlaybook(null);
      setPlaybookSource('basic');
      saveStorage(STORAGE.lastCity, cityQuery);
    } catch {
      setCityError('Live air quality provider unavailable. Retry or enter AQI manually.');
    } finally {
      setIsLoadingCity(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadStorage(STORAGE.profile, DEFAULT_PROFILE));
      community.setCompletedIds(loadStorage(STORAGE.pledges, []));
      community.setHotspots(loadStorage(STORAGE.hotspots, INITIAL_HOTSPOTS));
      community.setUpvotedIds(loadStorage(STORAGE.upvotes, []));
      const savedCity =
        typeof window !== 'undefined' ? localStorage.getItem(STORAGE.lastCity) : null;
      if (savedCity && savedCity.trim().length >= 2) void loadLiveCity(savedCity);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLiveCity]);

  const vent = useMemo(
    () =>
      selectedLocation &&
      !selectedLocation.hourlyError &&
      selectedLocation.hourlyPM25.length >= 24 &&
      selectedLocation.hourlyWind.length >= 24
        ? findSafeVentilationWindow(selectedLocation.hourlyPM25, selectedLocation.hourlyWind)
        : null,
    [selectedLocation]
  );
  const impact = useMemo(
    () => (selectedLocation ? computeDeterministicImpact(selectedLocation, profile) : null),
    [selectedLocation, profile]
  );
  const playbook = useMemo(
    () =>
      selectedLocation && impact
        ? aiPlaybook || buildDeterministicPlaybook(selectedLocation, profile, vent, impact)
        : null,
    [aiPlaybook, selectedLocation, profile, vent, impact]
  );
  const initGreeting = useCallback(
    (loc: LocationScenario) => setChatMessages([buildGreeting(loc)]),
    []
  );
  const defaultMessages = useMemo<ChatMessage[]>(
    () => (selectedLocation ? [buildGreeting(selectedLocation)] : []),
    [selectedLocation]
  );

  const handleSaveProfile = (newProfile: HouseholdProfile) => {
    setProfile(newProfile);
    setAiPlaybook(null);
    setPlaybookSource('basic');
    saveStorage(STORAGE.profile, newProfile);
    showToast('Household profile saved — recalculating impact!', 'success');
  };

  const clearAllData = () => {
    Object.values(STORAGE).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
    setSelectedLocation(null);
    setCityError(null);
    setLastCityQuery(null);
    setProfile(DEFAULT_PROFILE);
    community.setCompletedIds([]);
    community.setHotspots(INITIAL_HOTSPOTS);
    community.setUpvotedIds([]);
    setAiPlaybook(null);
    setChatMessages([]);
    showToast('All browser data cleared.', 'info');
  };

  return {
    location: selectedLocation,
    selectedLocation,
    setLocation: setSelectedLocation,
    isLoadingCity,
    cityError,
    lastCityQuery,
    loadLiveCity,
    profile,
    activeTab,
    setActiveTab,
    isProfileOpen,
    setIsProfileOpen,
    vent,
    impact,
    playbook,
    playbookSource,
    setPlaybookSource,
    completedIds: community.completedIds,
    hotspots: community.hotspots,
    upvotedIds: community.upvotedIds,
    chatMessages: chatMessages.length > 0 ? chatMessages : defaultMessages,
    setChatMessages,
    isGeneratingAI,
    setIsGeneratingAI,
    isChatLoading,
    setIsChatLoading,
    handleSaveProfile,
    togglePledge: community.togglePledge,
    toggleUpvote: community.toggleUpvote,
    addHotspot: community.addHotspot,
    removeHotspot: community.removeHotspot,
    initGreeting,
    setAiPlaybook,
    clearAllData,
  };
}
