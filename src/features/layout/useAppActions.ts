'use client';

import { useToast } from './ToastContainer';
import { fetchLiveByCoords, buildManualScenario } from './fetchLiveCity';
import { getChatFallbackReply } from '@/features/copilot/chatFallback';
import { useAiConsent } from '@/features/copilot/useAiConsent';
import type { useVayuSaathi } from './useVayuSaathi';

type VayuState = ReturnType<typeof useVayuSaathi>;
type ToastFn = ReturnType<typeof useToast>['showToast'];

async function postPlaybookAi(state: VayuState, showToast: ToastFn) {
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
  } catch {
    // fallback below
  } finally {
    state.setIsGeneratingAI(false);
  }
  state.setPlaybookSource('basic');
  showToast('Generated playbook from local rules engine.', 'info');
}

async function postAskAi(text: string, state: VayuState) {
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
  } catch {
    // fallback below
  } finally {
    state.setIsChatLoading(false);
  }
  const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
  state.setChatMessages((prev) => [...prev, { role: 'assistant', text: reply, source: 'basic' }]);
}

export function useAppActions(state: VayuState) {
  const { showToast } = useToast();
  const { aiConsent, pendingAction, setPendingAction, saveConsent } = useAiConsent();

  const handleUseGeolocation = async () => {
    if (!navigator.geolocation)
      return showToast('Geolocation not supported in this browser.', 'warning');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          state.setLocation(await fetchLiveByCoords(pos.coords.latitude, pos.coords.longitude));
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

  const handleGenerateAI = async () => {
    if (!state.location || !state.impact) return;
    if (aiConsent === null) return setPendingAction({ type: 'playbook' });
    if (aiConsent === 'basic') {
      state.setAiPlaybook(null);
      state.setPlaybookSource('basic');
      return showToast('Generated playbook in Basic mode (local rules).', 'info');
    }
    await postPlaybookAi(state, showToast);
  };

  const runSendMessage = async (text: string, override?: 'allow' | 'basic') => {
    if (!state.location || !state.impact) return;
    if ((override ?? aiConsent) === 'basic') {
      const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
      state.setChatMessages((prev) => [
        ...prev,
        { role: 'user', text },
        { role: 'assistant', text: reply, source: 'basic' },
      ]);
      return;
    }
    await postAskAi(text, state);
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
      if (choice === 'allow') await postPlaybookAi(state, showToast);
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
