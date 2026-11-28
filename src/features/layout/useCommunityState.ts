'use client';

import { useState, useCallback } from 'react';
import { INITIAL_HOTSPOTS, type HotspotReport } from '@/features/community/SmogPinboard';
import { STORAGE, loadStorage, saveStorage } from './storage';

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function useHotspotList() {
  const [hotspots, setHotspots] = useState<HotspotReport[]>(INITIAL_HOTSPOTS);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);

  const toggleUpvote = (id: string) => {
    const isUp = upvotedIds.includes(id);
    const nextUpvotes = toggleInList(upvotedIds, id);
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
    hotspots,
    setHotspots,
    upvotedIds,
    setUpvotedIds,
    toggleUpvote,
    addHotspot,
    removeHotspot,
  };
}

/** Manages device-local community pledges, hotspots, and upvote state. */
export function useCommunityState() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const {
    hotspots,
    setHotspots,
    upvotedIds,
    setUpvotedIds,
    toggleUpvote,
    addHotspot,
    removeHotspot,
  } = useHotspotList();

  const hydrateCommunity = useCallback(() => {
    setCompletedIds(loadStorage(STORAGE.pledges, []));
    setHotspots(loadStorage(STORAGE.hotspots, INITIAL_HOTSPOTS));
    setUpvotedIds(loadStorage(STORAGE.upvotes, []));
  }, [setHotspots, setUpvotedIds]);

  const resetCommunity = useCallback(() => {
    setCompletedIds([]);
    setHotspots(INITIAL_HOTSPOTS);
    setUpvotedIds([]);
  }, [setHotspots, setUpvotedIds]);

  const togglePledge = (id: string) => {
    const next = toggleInList(completedIds, id);
    setCompletedIds(next);
    saveStorage(STORAGE.pledges, next);
  };

  return {
    completedIds,
    hotspots,
    upvotedIds,
    hydrateCommunity,
    resetCommunity,
    togglePledge,
    toggleUpvote,
    addHotspot,
    removeHotspot,
  };
}
