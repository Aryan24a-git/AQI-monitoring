'use client';

import { useState } from 'react';

const AI_CONSENT_KEY = 'vayusaathi_ai_consent';
export type AiConsentChoice = 'allow' | 'basic';
export type PendingAiAction = { type: 'playbook' } | { type: 'ask'; text: string };

/** Use ai consent. */
export function useAiConsent() {
  const [aiConsent, setAiConsent] = useState<AiConsentChoice | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem(AI_CONSENT_KEY);
    return saved === 'allow' || saved === 'basic' ? saved : null;
  });
  const [pendingAction, setPendingAction] = useState<PendingAiAction | null>(null);

  const saveConsent = (choice: AiConsentChoice) => {
    setAiConsent(choice);
    window.localStorage.setItem(AI_CONSENT_KEY, choice);
  };

  return { aiConsent, pendingAction, setPendingAction, saveConsent };
}
