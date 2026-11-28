'use client';

import { getChatFallbackReply } from '@/features/copilot/chatFallback';
import type { useToast } from './ToastContainer';
import type { useVayuSaathi } from './useVayuSaathi';

export type VayuState = ReturnType<typeof useVayuSaathi>;
export type ToastFn = ReturnType<typeof useToast>['showToast'];

/** Requests an AI-personalized playbook from /api/playbook, falling back to basic mode. */
export async function postPlaybookAi(state: VayuState, showToast: ToastFn): Promise<void> {
  if (!state.location || !state.impact) return;
  state.setIsGeneratingAI(true);
  try {
    const res = await fetch('/api/playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: state.location,
        profile: state.profile,
        aiConsent: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const src: 'ai' | 'basic' = data.source === 'ai' ? 'ai' : 'basic';
      state.setAiPlaybook(data.playbook);
      state.setPlaybookSource(src);
      showToast(
        src === 'ai' ? 'Fresh AI Playbook synthesized!' : 'Generated playbook in Basic mode.',
        src === 'ai' ? 'success' : 'info'
      );
      return;
    }
  } catch (err) {
    console.warn('AI playbook request failed; falling back to local rules', err);
  } finally {
    state.setIsGeneratingAI(false);
  }
  state.setPlaybookSource('basic');
  showToast('Generated playbook from local rules engine.', 'info');
}

/** Sends a user question to /api/ask, falling back to local Q&A on network/provider error. */
export async function postAskAi(text: string, state: VayuState): Promise<void> {
  if (!state.location || !state.impact) return;
  state.setChatMessages((prev) => [...prev, { role: 'user', text }]);
  state.setIsChatLoading(true);
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: text,
        aqi: state.impact.aqi.naqi,
        pm25: state.location.pm25,
        aiConsent: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const full = data.disclaimer ? `${data.answer}\n\n*${data.disclaimer}*` : data.answer;
      const src: 'ai' | 'basic' = data.source === 'ai' && !data.fallback ? 'ai' : 'basic';
      state.setChatMessages((prev) => [...prev, { role: 'assistant', text: full, source: src }]);
      return;
    }
  } catch (err) {
    console.warn('AI ask request failed; falling back to local reply', err);
  } finally {
    state.setIsChatLoading(false);
  }
  const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
  state.setChatMessages((prev) => [...prev, { role: 'assistant', text: reply, source: 'basic' }]);
}
