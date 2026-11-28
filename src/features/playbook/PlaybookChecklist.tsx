'use client';

import React from 'react';
import { Home, Leaf, Sparkles } from 'lucide-react';
import type { PlaybookItem } from '@/domain/playbookEngine';

interface PlaybookChecklistProps {
  iaqHacks: PlaybookItem[];
  emissionSwaps: PlaybookItem[];
  completedIds: string[];
  onToggle: (id: string) => void;
}

function getRowClasses(checked: boolean, isAi: boolean, accent: 'emerald' | 'sky') {
  const badgeClass = isAi
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : accent === 'emerald'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-sky-50 text-sky-800 border-sky-200';
  const rowBg = checked
    ? 'bg-teal-50/60 border-teal-300'
    : isAi
      ? 'bg-indigo-50/20 hover:bg-indigo-50/40 border-indigo-200/70'
      : 'bg-stone-50/70 hover:bg-stone-100/70 border-stone-200/80';
  return { badgeClass, rowBg };
}

function ChecklistRowHeader({
  title,
  tag,
  isAi,
  titleCls,
  badgeClass,
}: {
  title: string;
  tag: string;
  isAi: boolean;
  titleCls: string;
  badgeClass: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className={`text-xs sm:text-[13px] font-bold leading-snug ${titleCls}`}>{title}</span>
      <span
        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClass}`}
      >
        {isAi && <Sparkles className="w-2.5 h-2.5 text-indigo-600" />}
        {tag}
      </span>
    </div>
  );
}

function ChecklistRow({
  item,
  accent,
  checked,
  onToggle,
}: {
  item: PlaybookItem;
  accent: 'emerald' | 'sky';
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const isAi = item.tag.includes('AI');
  const { badgeClass, rowBg } = getRowClasses(checked, isAi, accent);
  const titleCls = checked ? 'line-through text-slate-500' : 'text-slate-900';
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${rowBg}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(item.id)}
        className="mt-0.5 w-4 h-4 rounded text-teal-700 focus:ring-teal-600 cursor-pointer shrink-0 accent-teal-700"
      />
      <div className="flex-1 min-w-0">
        <ChecklistRowHeader
          title={item.title}
          tag={item.tag}
          isAi={isAi}
          titleCls={titleCls}
          badgeClass={badgeClass}
        />
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
      </div>
    </label>
  );
}

function ChecklistCard({
  title,
  subtitle,
  icon,
  items,
  accent,
  completedIds,
  onToggle,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: PlaybookItem[];
  accent: 'emerald' | 'sky';
  completedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-3">
        {icon}
        <div>
          <h4 className="font-bold text-sm sm:text-base text-slate-900">{title}</h4>
          <p className="text-[11px] text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-3 flex-1">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            accent={accent}
            checked={completedIds.includes(item.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

/** Playbook checklist. */
export function PlaybookChecklist({
  iaqHacks,
  emissionSwaps,
  completedIds,
  onToggle,
}: PlaybookChecklistProps) {
  return (
    <>
      <ChecklistCard
        title="Indoor Air Quality Hacks"
        subtitle="Protect your family indoors right now"
        icon={
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <Home className="w-4 h-4" />
          </div>
        }
        items={iaqHacks}
        accent="emerald"
        completedIds={completedIds}
        onToggle={onToggle}
      />
      <ChecklistCard
        title="Low-Emission Daily Swaps"
        subtitle="Prevent new smoke & tailpipe smog"
        icon={
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <Leaf className="w-4 h-4" />
          </div>
        }
        items={emissionSwaps}
        accent="sky"
        completedIds={completedIds}
        onToggle={onToggle}
      />
    </>
  );
}
