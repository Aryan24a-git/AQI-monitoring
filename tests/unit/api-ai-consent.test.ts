import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { handleAsk } from '../../src/server/api/ask';
import { handlePlaybook } from '../../src/server/api/playbook';
import { resetLlmAvailabilityForTests } from '../../src/server/llm/client';
import { CPCB_BANDS } from '../../src/domain/naqi';

function makeReq(path: string, body: Record<string, unknown>, ip = '10.0.0.1') {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('Server-side AI consent enforcement', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetLlmAvailabilityForTests();
    vi.stubEnv('GROQ_API_KEY', 'test-groq-key-unit');
    vi.stubEnv('LLM_ENABLED', 'true');
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('/api/ask: never calls provider without aiConsent, calls provider with aiConsent: true', async () => {
    const noConsentRes = await handleAsk(
      makeReq('/api/ask', { question: 'Should I open windows?', aqi: 220, pm25: 100 }, '10.0.1.1')
    );
    const noConsentBody = (await noConsentRes.json()) as {
      source: string;
      fallbackReason?: string;
    };
    expect(noConsentBody.source).toBe('basic');
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ answer: 'Keep windows closed during peak smog.' }),
            },
          },
        ],
      }),
    });
    const withConsentRes = await handleAsk(
      makeReq(
        '/api/ask',
        { question: 'Should I open windows?', aqi: 220, pm25: 100, aiConsent: true },
        '10.0.1.2'
      )
    );
    const withConsentBody = (await withConsentRes.json()) as { source: string };
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(withConsentBody.source).toBe('ai');
  });

  it('/api/playbook: never calls provider without aiConsent, calls provider with aiConsent: true', async () => {
    const basePayload = {
      location: {
        id: 'live-delhi',
        city: 'Delhi, India',
        shortCity: 'Delhi',
        subtitle: 'Model estimate',
        sourceLabel: 'Open-Meteo',
        pm25: 180,
        pm10: 250,
        no2: 40,
        wind: 5,
        hourlyPM25: Array(24).fill(180),
        hourlyWind: Array(24).fill(5),
      },
      profile: {
        vulnerabilities: ['kids'],
        purifier: 'none',
        kitchenExhaust: true,
        commuteMode: 'solo_car',
        commuteKm: 16,
        budgetTier: 'zero_cost',
      },
      vent: null,
      impact: {
        aqi: {
          naqi: 345,
          dominant: 'PM2.5',
          band: CPCB_BANDS[4],
          cigsPerDay: 8.2,
          subIndices: { subPM25: 345, subPM10: 200, subNO2: 50 },
        },
        km: 16,
        commuteCo2Kg: 2.2,
        totalCo2Kg: 2.5,
        totalNoxG: 10,
        commuteSwapLabel: 'Metro/Bus',
        maxExposureDropPct: 45,
        maxCigsAvoided: 3.7,
      },
    };

    const noConsentRes = await handlePlaybook(makeReq('/api/playbook', basePayload, '10.0.2.1'));
    const noConsentBody = (await noConsentRes.json()) as { source: string };
    expect(noConsentBody.source).toBe('basic');
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                aiSummary: 'Seal gaps and use wet mopping today in Delhi.',
                explainer: {
                  healthWhy: 'Wet mopping and sealing gaps cut indoor smoke infiltration.',
                  emissionWhy: 'Swapping solo car trips avoids local roadside NOx.',
                  vulnerabilityNote: 'Keep kids indoors during morning smog.',
                },
              }),
            },
          },
        ],
      }),
    });
    const withConsentRes = await handlePlaybook(
      makeReq('/api/playbook', { ...basePayload, aiConsent: true }, '10.0.2.2')
    );
    const withConsentBody = (await withConsentRes.json()) as { source: string };
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(withConsentBody.source).toBe('ai');
  });
});
