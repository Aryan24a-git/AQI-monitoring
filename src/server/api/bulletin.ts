import { NextRequest } from 'next/server';
import { z } from 'zod';
import { formatWhatsAppBulletin } from '@/domain/bulletinTemplate';
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
  wind: z.number().min(0).max(150),
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

  const bulletinText = formatWhatsAppBulletin(parsed.value);
  return securityJson(
    {
      bulletinText,
      lang: parsed.value.lang,
      source: 'VayuSaathi Community Advisory Engine',
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
