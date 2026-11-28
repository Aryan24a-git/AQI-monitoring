import { NextRequest } from 'next/server';
import { z } from 'zod';
import { formatWhatsAppBulletin } from '@/domain/bulletinTemplate';
import { AI_PROVIDER_LABEL, createLlmClient } from '@/server/llm/client';
import { REQUEST_ID_HEADER } from '@/server/http/requestId';
import { createRateLimiter, withJsonGuard } from '@/server/http/withApiGuards';
import { RATE_LIMITS } from '@/server/security/limits';
import { securityJson } from '@/server/security/response';

const limiter = createRateLimiter(RATE_LIMITS.bulletinPerMinute);

const BulletinRequestSchema = z.object({
  lang: z.enum(['en', 'hi']),
  rwaName: z.string().trim().max(120),
  city: z.string().trim().min(1).max(120),
  shortCity: z.string().trim().min(1).max(120),
  wind: z.number().min(0).max(150).optional().nullable(),
  pm25: z.number().min(0).max(1500),
  naqi: z.number().min(0).max(1000),
  bandLabel: z.string().min(1).max(60),
  cigsPerDay: z.number().min(0).max(100),
  windowLabel: z.string().min(1).max(60),
  sealLabel: z.string().min(1).max(60),
  aiConsent: z.boolean().optional().default(false),
});

/** Handle bulletin. */
export async function handleBulletin(req: NextRequest) {
  return withJsonGuard(req, limiter, BulletinRequestSchema, async ({ requestId, body }) => {
    const fallbackText = formatWhatsAppBulletin(body);
    let bulletinText = fallbackText;
    let source: 'ai' | 'basic' = 'basic';

    if (body.aiConsent) {
      const langInstruction =
        body.lang === 'hi'
          ? 'Write in natural, clear Hindi (Devanagari script).'
          : 'Write in clear, concise English.';
      const windSystemNote = body.wind != null ? `wind speed (${body.wind} km/h), ` : '';
      const windPromptNote = body.wind != null ? `Wind: ${body.wind} km/h, ` : '';
      const aiText = await createLlmClient().complete({
        system: `Write a fresh, neighborly WhatsApp RWA air-quality bulletin using WhatsApp *bold* formatting and emojis. ${langInstruction} Include the exact CPCB NAQI, PM2.5, least-polluted ventilation window, seal time, ${windSystemNote}and 2 practical community actions (no leaf burning, low-emission commute/wet mopping). Keep under 900 characters. Zero medical claims, no URLs.`,
        prompt: `Society: ${body.rwaName || body.shortCity + ' RWA'}, City: ${body.city}, NAQI: ${body.naqi} (${body.bandLabel}), PM2.5: ${body.pm25} µg/m³, Cigs eq: ${body.cigsPerDay}/day, ${windPromptNote}Best Window: ${body.windowLabel}, Seal By: ${body.sealLabel}.`,
        maxTokens: 800,
        timeoutMs: 12_000,
      });
      if (aiText && aiText.trim().length >= 60 && !/https?:\/\/|<[^>]+>/.test(aiText)) {
        bulletinText = aiText.trim();
        source = 'ai';
      }
    }

    return securityJson(
      {
        bulletinText,
        lang: body.lang,
        source,
        sourceLabel: source === 'ai' ? AI_PROVIDER_LABEL : 'VayuSaathi Community Advisory Engine',
        generatedAt: new Date().toISOString(),
      },
      200,
      { [REQUEST_ID_HEADER]: requestId }
    );
  });
}
