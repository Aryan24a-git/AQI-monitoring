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
import type { ChatMessage } from '@/features/copilot/CopilotChat';
import { useToast } from './ToastContainer';
import { STORAGE, loadStorage, saveStorage, removeStorage } from './storage';
import { useCommunityState } from './useCommunityState';
import { useCityLoader } from './useCityLoader';

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

function useDerivedPlaybook(
  loc: LocationScenario | null,
  profile: HouseholdProfile,
  aiPlaybook: PlaybookData | null
) {
  const vent = useMemo(
    () =>
      loc && !loc.hourlyError && loc.hourlyPM25.length >= 24 && loc.hourlyWind.length >= 24
        ? findSafeVentilationWindow(loc.hourlyPM25, loc.hourlyWind)
        : null,
    [loc]
  );
  const impact = useMemo(
    () => (loc ? computeDeterministicImpact(loc, profile) : null),
    [loc, profile]
  );
  const playbook = useMemo(
    () =>
      loc && impact ? aiPlaybook || buildDeterministicPlaybook(loc, profile, vent, impact) : null,
    [aiPlaybook, loc, profile, vent, impact]
  );
  return { vent, impact, playbook };
}

function useAppUiState() {
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<'playbook' | 'copilot' | 'community'>('playbook');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [playbookSource, setPlaybookSource] = useState<'ai' | 'basic'>('basic');
  const [aiPlaybook, setAiPlaybook] = useState<PlaybookData | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const resetAiPlaybook = useCallback(() => {
    setAiPlaybook(null);
    setPlaybookSource('basic');
  }, []);
  return {
    profile,
    setProfile,
    activeTab,
    setActiveTab,
    isProfileOpen,
    setIsProfileOpen,
    playbookSource,
    setPlaybookSource,
    aiPlaybook,
    setAiPlaybook,
    isGeneratingAI,
    setIsGeneratingAI,
    chatMessages,
    setChatMessages,
    isChatLoading,
    setIsChatLoading,
    resetAiPlaybook,
  };
}

function useMountHydration(
  setProfile: (p: HouseholdProfile) => void,
  hydrateCommunity: () => void,
  loadLiveCity: (q: string) => Promise<void>
) {
  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadStorage(STORAGE.profile, DEFAULT_PROFILE));
      hydrateCommunity();
      const savedCity =
        typeof window !== 'undefined' ? localStorage.getItem(STORAGE.lastCity) : null;
      if (savedCity && savedCity.trim().length >= 2) void loadLiveCity(savedCity);
    });
  }, [setProfile, hydrateCommunity, loadLiveCity]);
}

function useProfileAndClear(
  ui: ReturnType<typeof useAppUiState>,
  city: ReturnType<typeof useCityLoader>,
  community: ReturnType<typeof useCommunityState>
) {
  const { showToast } = useToast();
  const handleSaveProfile = (newProfile: HouseholdProfile) => {
    ui.setProfile(newProfile);
    ui.resetAiPlaybook();
    saveStorage(STORAGE.profile, newProfile);
    showToast('Household profile saved — recalculating impact!', 'success');
  };
  const clearAllData = () => {
    Object.values(STORAGE).forEach(removeStorage);
    city.resetCityState();
    ui.setProfile(DEFAULT_PROFILE);
    community.resetCommunity();
    ui.resetAiPlaybook();
    ui.setChatMessages([]);
    showToast('All browser data cleared.', 'info');
  };
  return { handleSaveProfile, clearAllData };
}

/** Root application state hook composing city loading, profile, playbook, and community state. */
export function useVayuSaathi() {
  const ui = useAppUiState();
  const community = useCommunityState();
  const city = useCityLoader(ui.resetAiPlaybook);
  useMountHydration(ui.setProfile, community.hydrateCommunity, city.loadLiveCity);

  const derived = useDerivedPlaybook(city.selectedLocation, ui.profile, ui.aiPlaybook);
  const { setChatMessages } = ui;
  const initGreeting = useCallback(
    (loc: LocationScenario) => setChatMessages([buildGreeting(loc)]),
    [setChatMessages]
  );
  const defaultMessages = useMemo<ChatMessage[]>(
    () => (city.selectedLocation ? [buildGreeting(city.selectedLocation)] : []),
    [city.selectedLocation]
  );
  const { handleSaveProfile, clearAllData } = useProfileAndClear(ui, city, community);

  return {
    ...ui,
    ...city,
    ...derived,
    ...community,
    location: city.selectedLocation,
    setLocation: city.setSelectedLocation,
    chatMessages: ui.chatMessages.length > 0 ? ui.chatMessages : defaultMessages,
    handleSaveProfile,
    initGreeting,
    clearAllData,
  };
}
