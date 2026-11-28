'use client';

import React, { useState, useMemo } from 'react';
import { MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import type { LocationScenario, CalculatedImpact } from '@/domain/scenarios';
import type { VentilationWindow } from '@/domain/naqi';
import { formatWhatsAppBulletin } from '@/domain/bulletinTemplate';
import { useToast } from '@/features/layout/ToastContainer';
import { useAiConsent } from '@/features/copilot/useAiConsent';
import { AiConsentModal } from '@/features/copilot/AiConsentModal';
import { WhatsAppPreview } from './WhatsAppPreview';

interface WhatsAppGeneratorProps {
  location: LocationScenario;
  vent: VentilationWindow | null;
  impact: CalculatedImpact;
}

function BulletinHeader({
  lang,
  onLangChange,
}: {
  lang: 'en' | 'hi';
  onLangChange: (l: 'en' | 'hi') => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900">1-Tap WhatsApp RWA Bulletin</h3>
          <p className="text-[11px] text-slate-600">
            Share factual smog timing &amp; anti-burning alerts
          </p>
        </div>
      </div>
      <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
        <button
          type="button"
          onClick={() => onLangChange('en')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          English
        </button>
        <button
          type="button"
          lang="hi"
          onClick={() => onLangChange('hi')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${lang === 'hi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          हिन्दी
        </button>
      </div>
    </div>
  );
}

function buildBulletinRequestBody(
  props: WhatsAppGeneratorProps,
  lang: 'en' | 'hi',
  rwaName: string,
  consentGranted: boolean
) {
  return JSON.stringify({
    lang,
    rwaName,
    city: props.location.city,
    shortCity: props.location.shortCity,
    wind: props.location.wind,
    pm25: props.location.pm25,
    naqi: props.impact.aqi.naqi,
    bandLabel: props.impact.aqi.band.label,
    cigsPerDay: props.impact.aqi.cigsPerDay,
    windowLabel: props.vent?.windowLabel ?? 'Midday window (hourly unavailable)',
    sealLabel: props.vent?.sealLabel ?? 'Evening inversion',
    aiConsent: consentGranted,
  });
}

function useBulletinDraft(props: WhatsAppGeneratorProps, lang: 'en' | 'hi', rwaName: string) {
  const { showToast } = useToast();
  const [customBulletin, setCustomBulletin] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);

  const runDraftBulletin = async (consentGranted: boolean) => {
    setIsDrafting(true);
    try {
      const res = await fetch('/api/bulletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildBulletinRequestBody(props, lang, rwaName, consentGranted),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomBulletin(data.bulletinText);
        return showToast('Generated fresh RWA advisory!', 'success');
      }
      setCustomBulletin(null);
      showToast('Generated advisory from local engine.', 'success');
    } catch {
      setCustomBulletin(null);
      showToast('Generated advisory from local engine.', 'success');
    } finally {
      setIsDrafting(false);
    }
  };

  return { customBulletin, setCustomBulletin, isDrafting, runDraftBulletin };
}

function BulletinInputRow({
  rwaName,
  onRwaChange,
  isDrafting,
  onDraftAi,
}: {
  rwaName: string;
  onRwaChange: (v: string) => void;
  isDrafting: boolean;
  onDraftAi: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        aria-label="Society or RWA name"
        value={rwaName}
        onChange={(e) => onRwaChange(e.target.value)}
        placeholder="Enter your Society / RWA name..."
        className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
      />
      <button
        type="button"
        disabled={isDrafting}
        onClick={onDraftAi}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
      >
        {isDrafting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span>Generate with AI</span>
      </button>
    </div>
  );
}

function useBulletinText(
  props: WhatsAppGeneratorProps,
  lang: 'en' | 'hi',
  rwaName: string,
  customBulletin: string | null
): string {
  const { location, vent, impact } = props;
  return useMemo(
    () =>
      customBulletin ??
      formatWhatsAppBulletin({
        lang,
        rwaName,
        city: location.city,
        shortCity: location.shortCity,
        wind: location.wind,
        pm25: location.pm25,
        naqi: impact.aqi.naqi,
        bandLabel: impact.aqi.band.label,
        cigsPerDay: impact.aqi.cigsPerDay,
        windowLabel: vent?.windowLabel ?? null,
        sealLabel: vent?.sealLabel ?? null,
      }),
    [customBulletin, lang, rwaName, location, vent, impact]
  );
}

async function copyBulletinText(
  text: string,
  showToast: ReturnType<typeof useToast>['showToast']
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast('WhatsApp bulletin copied to clipboard!', 'success');
  } catch {
    showToast('Could not copy automatically — please select and copy.', 'error');
  }
}

function useBulletinActions(
  draft: ReturnType<typeof useBulletinDraft>,
  showToast: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void
) {
  const [showConsent, setShowConsent] = useState(false);
  const { aiConsent, saveConsent } = useAiConsent();

  const handleDraftWithAI = () => {
    if (aiConsent === null) return setShowConsent(true);
    if (aiConsent === 'basic') {
      draft.setCustomBulletin(null);
      return showToast('Generated advisory from local engine (Basic mode).', 'info');
    }
    void draft.runDraftBulletin(true);
  };
  const onAllow = () => {
    saveConsent('allow');
    setShowConsent(false);
    void draft.runDraftBulletin(true);
  };
  const onDecline = () => {
    saveConsent('basic');
    setShowConsent(false);
    draft.setCustomBulletin(null);
    showToast('Using Basic mode (local engine).', 'info');
  };
  return { showConsent, handleDraftWithAI, onAllow, onDecline };
}

/** Bilingual WhatsApp RWA bulletin generator with local fallback and optional AI rewrite. */
export function WhatsAppGenerator({ location, vent, impact }: WhatsAppGeneratorProps) {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [rwaName, setRwaName] = useState('Green Park / Residents Welfare Group');
  const draft = useBulletinDraft({ location, vent, impact }, lang, rwaName);
  const bulletinText = useBulletinText(
    { location, vent, impact },
    lang,
    rwaName,
    draft.customBulletin
  );
  const { showConsent, handleDraftWithAI, onAllow, onDecline } = useBulletinActions(
    draft,
    showToast
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-3.5">
        <BulletinHeader lang={lang} onLangChange={setLang} />
        <BulletinInputRow
          rwaName={rwaName}
          onRwaChange={setRwaName}
          isDrafting={draft.isDrafting}
          onDraftAi={handleDraftWithAI}
        />
        <WhatsAppPreview
          bulletinText={bulletinText}
          lang={lang}
          onCopy={() => void copyBulletinText(bulletinText, showToast)}
        />
      </div>
      {showConsent && <AiConsentModal onAllow={onAllow} onDecline={onDecline} />}
    </div>
  );
}
