import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createDefaultProfile, ProfileSchema } from '@/domain/profile';
import { buildBasicPlan } from '@/domain/plan';
import { ask } from '@/server/llm/ask';
import { createLlmClient, NullClient } from '@/server/llm/client';
import { REQUEST_ID_HEADER } from '@/server/http/requestId';
import { createRateLimiter, withJsonGuard } from '@/server/http/withApiGuards';
import { RATE_LIMITS, MAX_QUESTION_LENGTH } from '@/server/security/limits';
import { securityJson } from '@/server/security/response';

const limiter = createRateLimiter(RATE_LIMITS.askPerMinute);

const RequestSchema = z.object({
  question: z.string().trim().min(3).max(MAX_QUESTION_LENGTH),
  profile: ProfileSchema.optional(),
  aqi: z.number().min(0).max(1000).optional().default(175),
  pm25: z.number().min(0).max(1500).optional().default(72),
  aiConsent: z.boolean().optional().default(false),
});

export async function handleAsk(req: NextRequest) {
  return withJsonGuard(req, limiter, RequestSchema, async ({ requestId, body }) => {
    const now = new Date();
    const profile = body.profile ?? createDefaultProfile();
    const snapshot = {
      aqi: body.aqi ?? 175,
      pm25: body.pm25 ?? 72,
      timestamp: now.toISOString(),
      provider: 'Basic context',
      isStale: false,
      isFallback: false,
    };
    const plan = buildBasicPlan(profile, snapshot, now);
    const client = body.aiConsent ? createLlmClient() : new NullClient();
    const answer = await ask(body.question, profile, plan, client);
    if (!body.aiConsent && answer.source === 'basic') {
      return securityJson(
        { ...answer, fallbackReason: answer.fallbackReason ?? 'consent_not_granted' },
        200,
        { [REQUEST_ID_HEADER]: requestId }
      );
    }
    return securityJson(answer, 200, { [REQUEST_ID_HEADER]: requestId });
  });
}
