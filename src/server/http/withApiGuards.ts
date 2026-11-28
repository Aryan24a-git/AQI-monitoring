import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import { getRequestId } from '@/server/http/requestId';
import {
  MemoryBucketStore,
  TokenBucketLimiter,
  getHashedClientKey,
} from '@/server/security/rateLimit';
import { boundaryError, readJsonBoundary } from '@/server/security/limits';
import { apiErrorResponse } from '@/server/security/response';

const RATE_LIMIT_WINDOW_MS = 60_000;

/** Create rate limiter. */
export function createRateLimiter(limitPerMinute: number): TokenBucketLimiter {
  return new TokenBucketLimiter(limitPerMinute, RATE_LIMIT_WINDOW_MS, new MemoryBucketStore());
}

function rateLimitedResponse(requestId: string, seconds: number) {
  const error = boundaryError('RATE_LIMITED', 'Rate limit exceeded', requestId, 429).error;
  return apiErrorResponse(error, 429, { 'Retry-After': String(seconds) });
}

/** With rate limit. */
export async function withRateLimit(
  req: NextRequest,
  limiter: TokenBucketLimiter,
  handler: (ctx: { req: NextRequest; requestId: string }) => Promise<Response>
): Promise<Response> {
  const requestId = getRequestId(req);
  const limit = limiter.check(getHashedClientKey(req));
  if (!limit.allowed) return rateLimitedResponse(requestId, limit.retryAfterSeconds);
  try {
    return await handler({ req, requestId });
  } catch {
    return apiErrorResponse(
      boundaryError('INTERNAL_ERROR', 'Unexpected server error', requestId, 500).error,
      500
    );
  }
}

/** With json guard. */
export async function withJsonGuard<T>(
  req: NextRequest,
  limiter: TokenBucketLimiter,
  schema: z.ZodType<T>,
  handler: (ctx: { req: NextRequest; requestId: string; body: T }) => Promise<Response>
): Promise<Response> {
  return withRateLimit(req, limiter, async ({ requestId }) => {
    const parsed = await readJsonBoundary(req, schema, requestId);
    if (!parsed.ok) return apiErrorResponse(parsed.error, parsed.status);
    return handler({ req, requestId, body: parsed.value });
  });
}
