'use client';

import { useToast } from './ToastContainer';
import { fetchLiveByCoords, buildManualScenario } from './fetchLiveCity';
import { getChatFallbackReply } from '@/features/copilot/chatFallback';
import { useAiConsent } from '@/features/copilot/useAiConsent';
import { postAskAi, postPlaybookAi, type ToastFn, type VayuState } from './aiApi';

function requestBrowserLocation(state: VayuState, showToast: ToastFn) {
  if (!navigator.geolocation) {
    return showToast('Geolocation not supported in this browser.', 'warning');
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        state.setLocation(await fetchLiveByCoords(pos.coords.latitude, pos.coords.longitude));
        state.setPlaybookSource('basic');
        state.setAiPlaybook(null);
        showToast('Loaded live air quality for your approximate area.', 'success');
      } catch (err) {
        console.warn('Coordinate AQI lookup failed', err);
        showToast('Live air quality service unavailable. Enter AQI manually.', 'warning');
      }
    },
    () => showToast('Location permission denied. Search your city above.', 'info')
  );
}

function appendBasicReply(text: string, state: VayuState) {
  if (!state.location || !state.impact) return;
  const reply = getChatFallbackReply(text, state.location, state.impact, state.vent);
  state.setChatMessages((prev) => [
    ...prev,
    { role: 'user', text },
    { role: 'assistant', text: reply, source: 'basic' },
  ]);
}

function useConsentActions(state: VayuState, showToast: ToastFn) {
  const { aiConsent, pendingAction, setPendingAction, saveConsent } = useAiConsent();

  const runSendMessage = async (text: string, override?: 'allow' | 'basic') => {
    if (!state.location || !state.impact) return;
    if ((override ?? aiConsent) === 'basic') return appendBasicReply(text, state);
    await postAskAi(text, state);
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
    if (action.type === 'ask') return runSendMessage(action.text, choice);
    if (choice === 'allow') return postPlaybookAi(state, showToast);
    state.setAiPlaybook(null);
    state.setPlaybookSource('basic');
    showToast('Using Basic mode (local rules).', 'info');
  };

  return { pendingAction, handleGenerateAI, handleSendMessage, handleConsentChoice };
}

/** Coordinates user actions (geolocation, manual PM2.5, AI playbook & chat with consent). */
export function useAppActions(state: VayuState) {
  const { showToast } = useToast();
  const consentActions = useConsentActions(state, showToast);

  const handleManualPm25 = (pm25: number) => {
    state.setLocation(buildManualScenario(pm25));
    state.setAiPlaybook(null);
    state.setPlaybookSource('basic');
    showToast(`Applied manual PM2.5 reading (${pm25} µg/m³).`, 'info');
  };

  return {
    ...consentActions,
    handleUseGeolocation: () => requestBrowserLocation(state, showToast),
    handleManualPm25,
  };
}
