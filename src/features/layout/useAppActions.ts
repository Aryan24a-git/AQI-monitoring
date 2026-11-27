'use client';

import { useToast } from './ToastContainer';
import { fetchLiveByCoords, buildManualScenario } from './fetchLiveCity';
import { getChatFallbackReply } from '@/features/copilot/chatFallback';
import { useAiConsent } from '@/features/copilot/useAiConsent';
import type { useVayuSaathi } from './useVayuSaathi';

type VayuState = ReturnType<typeof useVayuSaathi>;

export function useAppActions(state: VayuState) {
  const { showToast } = useToast();
  const { aiConsent, pendingAction, setPendingAction, saveConsent } = useAiConsent();

  const handleUseGeolocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported in this browser.', 'warning');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await fetchLiveByCoords(pos.coords.latitude, pos.coords.longitude);
          state.setLocation(loc);
          state.setPlaybookSource('basic');
          state.setAiPlaybook(null);
          showToast('Loaded live air quality for your approximate area.', 'success');
        } catch {
          showToast('Live air quality service unavailable. Enter AQI manually.', 'warning');
        }
      },
      () => showToast('Location permission denied. Search your city above.', 'info')
    );
  };

  const handleManualPm25 = (pm25: number) => {
    state.setLocation(buildManualScenario(pm25));
    state.setAiPlaybook(null);
    state.setPlaybookSource('basic');
    showToast(`Applied manual PM2.5 reading (${pm25} µg/m³).`, 'info');
  };

  const runGenerateAI = async () => {
    if (!state.location || !state.impact) return;
    state.setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: state.location,
          profile: state.profile,
          vent: state.vent,
          impact: state.impact,
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
      } else {
        state.setPlaybookSource('basic');
        showToast('Generated playbook from local rules engine.', 'info');
      }
    } catch {
      state.setPlaybookSource('basic');
      showToast('Generated playbook from local rules engine.', 'info');
    } finally {
      state.setIsGeneratingAI(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!state.location || !state.impact) return;
    if (aiConsent === null) return setPendingAction({ type: 'playbook' });
    if (aiConsent === 'basic') {
      state.setAiPlaybook(null);
      state.setPlaybookSource('basic');
      showToast('Generated playbook in Basic mode (local rules).', 'info');
      return;
    }
    await runGenerateAI();
  };

  const runSendMessage = async (text: string, consentOverride?: 'allow' | 'basic') => {
    if (!state.location || !state.impact) return;
    const effective = consentOverride ?? aiConsent;
    if (effective === 'basic') {
      const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
      state.setChatMessages((prev) => [
        ...prev,
        { role: 'user', text },
        { role: 'assistant', text: reply, source: 'basic' },
      ]);
      return;
    }
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
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const full = data.disclaimer ? `${data.answer}\n\n*${data.disclaimer}*` : data.answer;
        const src: 'ai' | 'basic' = data.source === 'ai' && !data.fallback ? 'ai' : 'basic';
        state.setChatMessages((prev) => [...prev, { role: 'assistant', text: full, source: src }]);
      } else {
        const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
        state.setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', text: reply, source: 'basic' },
        ]);
      }
    } catch {
      const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
      state.setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: reply, source: 'basic' },
      ]);
    } finally {
      state.setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!state.location || !state.impact) return;
    if (aiConsent === null) return setPendingAction({ type: 'ask', text });
    await runSendMessage(text);
  };

  const handleConsentChoice = async (choice: 'allow' | 'basic') => {
    saveConsent(choice);
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    if (action.type === 'playbook') {
      if (choice === 'allow') await runGenerateAI();
      else {
        state.setAiPlaybook(null);
        state.setPlaybookSource('basic');
        showToast('Using Basic mode (local rules).', 'info');
      }
    } else {
      await runSendMessage(action.text, choice);
    }
  };

  return {
    pendingAction,
    handleUseGeolocation,
    handleManualPm25,
    handleGenerateAI,
    handleSendMessage,
    handleConsentChoice,
  };
}
