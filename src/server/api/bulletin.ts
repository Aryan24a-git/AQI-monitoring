import { NextRequest } from 'next/server';
import { z } from 'zod';
import { formatWhatsAppBulletin } from '@/domain/bulletinTemplate';
import { createLlmClient } from '@/server/llm/client';
import { getRequestId, REQUEST_ID_HEADER } from '@/server/http/requestId';
import {
  MemoryBucketStore,
  TokenBucketLimiter,
  getHashedClientKey,
} from '@/server/security/rateLimit';
import { RATE_LIMITS, readJsonBoundary } from '@/server/security/limits';
import { apiErrorResponse, securityJson } from '@/server/security/response';

const limiter = new TokenBucketLimiter(
  RATE_LIMITS.bulletinPerMinute,
  60_000,
  new MemoryBucketStore()
);

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

export async function handleBulletin(req: NextRequest) {
  const requestId = getRequestId(req);
  const limit = limiter.check(getHashedClientKey(req));
  if (!limit.allowed) return rateLimited(requestId, limit.retryAfterSeconds);

  const parsed = await readJsonBoundary(req, BulletinRequestSchema, requestId);
  if (!parsed.ok) return apiErrorResponse(parsed.error, parsed.status);

  const fallbackText = formatWhatsAppBulletin(parsed.value);
  let bulletinText = fallbackText;
  let source: 'ai' | 'basic' = 'basic';

  if (parsed.value.aiConsent) {
    const v = parsed.value;
    const langInstruction =
      v.lang === 'hi'
        ? 'Write in natural, clear Hindi (Devanagari script).'
        : 'Write in clear, concise English.';
    const windSystemNote = v.wind != null ? `wind speed (${v.wind} km/h), ` : '';
    const windPromptNote = v.wind != null ? `Wind: ${v.wind} km/h, ` : '';
    const aiText = await createLlmClient().complete({
      system: `Write a fresh, neighborly WhatsApp RWA air-quality bulletin using WhatsApp *bold* formatting and emojis. ${langInstruction} Include the exact CPCB NAQI, PM2.5, safe ventilation window, seal time, ${windSystemNote}and 2 practical community actions (no leaf burning, low-emission commute/wet mopping). Keep under 900 characters. Zero medical claims, no URLs.`,
      prompt: `Society: ${v.rwaName || v.shortCity + ' RWA'}, City: ${v.city}, NAQI: ${v.naqi} (${v.bandLabel}), PM2.5: ${v.pm25} µg/m³, Cigs eq: ${v.cigsPerDay}/day, ${windPromptNote}Safe Window: ${v.windowLabel}, Seal By: ${v.sealLabel}.`,
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
      lang: parsed.value.lang,
      source,
      sourceLabel: source === 'ai' ? 'Groq Grounded AI' : 'VayuSaathi Community Advisory Engine',
      generatedAt: new Date().toISOString(),
    },
    200,
    { [REQUEST_ID_HEADER]: requestId }
  );
}

function rateLimited(requestId: string, seconds: number) {
  return apiErrorResponse(
    {
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      requestId,
      timestamp: new Date().toISOString(),
    },
    429,
    { 'Retry-After': String(seconds) }
  );
}
