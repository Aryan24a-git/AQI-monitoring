'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

interface AiConsentModalProps {
  onAllow: () => void;
  onDecline: () => void;
}

function ConsentCopy() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <div>
        <h3 id="ai-consent-title" className="font-bold text-base text-slate-900">
          Use Groq AI for answers?
        </h3>
        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
          Your question and today&apos;s air data are sent to Groq to write the answer. Your
          household profile stays in your browser.
        </p>
        <Link
          href="/privacy"
          className="inline-block text-xs font-semibold text-teal-800 underline mt-1.5"
        >
          Read Privacy &amp; Data Notice
        </Link>
      </div>
    </div>
  );
}

/** Explicit opt-in modal before sending air data or user prompts to Groq AI. */
export function AiConsentModal({ onAllow, onDecline }: AiConsentModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-5 space-y-4">
        <ConsentCopy />
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onDecline}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold border border-stone-200 transition"
          >
            Use basic mode
          </button>
          <button
            type="button"
            onClick={onAllow}
            className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm transition"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
