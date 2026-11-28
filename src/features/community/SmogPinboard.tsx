'use client';

import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import type { LocationScenario } from '@/domain/scenarios';
import { useToast } from '@/features/layout/ToastContainer';
import { type HotspotReport, INITIAL_HOTSPOTS } from './hotspotTypes';
import { HotspotForm, HotspotCard } from './HotspotComponents';

export { type HotspotReport, INITIAL_HOTSPOTS };

interface SmogPinboardProps {
  location: LocationScenario;
  hotspots: HotspotReport[];
  upvotedIds: string[];
  onAddHotspot: (report: HotspotReport) => void;
  onToggleUpvote: (id: string) => void;
  onRemoveHotspot: (id: string) => void;
}

function PinboardHeader({ count }: { count: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900">Device-Local Smog Watch Pinboard</h3>
          <p className="text-[11px] text-slate-500">
            Saved on this device only — Record local leaf burning, construction dust, or traffic
            bottlenecks
          </p>
        </div>
      </div>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-slate-700 w-fit">
        {count} saved on device
      </span>
    </div>
  );
}

function HotspotList({
  hotspots,
  upvotedIds,
  onToggleUpvote,
  onRemoveHotspot,
}: {
  hotspots: HotspotReport[];
  upvotedIds: string[];
  onToggleUpvote: (id: string) => void;
  onRemoveHotspot: (id: string) => void;
}) {
  if (hotspots.length === 0) {
    return (
      <div className="h-full min-h-[180px] rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <p className="text-xs font-semibold text-slate-700">
          No reports yet. Add the first one (saved on this device only)
        </p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
          Use the form to record local observations (e.g. leaf burning or dust). Reports stay on
          this browser and can be copied to WhatsApp.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {hotspots.map((item) => (
        <HotspotCard
          key={item.id}
          item={item}
          isUpvoted={upvotedIds.includes(item.id)}
          onToggleUpvote={onToggleUpvote}
          onRemove={onRemoveHotspot}
        />
      ))}
    </div>
  );
}

function useHotspotFormState(shortCity: string, onAddHotspot: (report: HotspotReport) => void) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<HotspotReport['category']>('Open Waste Burning');
  const [locality, setLocality] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locality.trim() || !description.trim()) return;
    onAddHotspot({
      id: `hs-${Date.now()}`,
      city: shortCity,
      category,
      locality: locality.trim(),
      description: description.trim(),
      upvotes: 1,
      timeAgo: 'Just now',
      createdAt: new Date().toISOString(),
    });
    setLocality('');
    setDescription('');
    showToast('Saved to device-local pinboard!', 'success');
  };
  return {
    category,
    setCategory,
    locality,
    setLocality,
    description,
    setDescription,
    handleSubmit,
  };
}

/** Device-local community smog hotspot pinboard with form and upvotable cards. */
export function SmogPinboard({
  location,
  hotspots,
  upvotedIds,
  onAddHotspot,
  onToggleUpvote,
  onRemoveHotspot,
}: SmogPinboardProps) {
  const form = useHotspotFormState(location.shortCity, onAddHotspot);
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
      <PinboardHeader count={hotspots.length} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <HotspotForm {...form} onSubmit={form.handleSubmit} />
        <div className="lg:col-span-8">
          <HotspotList
            hotspots={hotspots}
            upvotedIds={upvotedIds}
            onToggleUpvote={onToggleUpvote}
            onRemoveHotspot={onRemoveHotspot}
          />
        </div>
      </div>
    </div>
  );
}
