import { DEFAULT_GROQ_MODEL, getEnv } from '../config/env';
import { logger } from '../logging/logger';

export const AI_PROVIDER_LABEL = 'Groq Grounded AI';

export interface LlmRequest {
  system: string;
  prompt: string;
  maxTokens: number;
  timeoutMs: number;
  jsonMode?: boolean;
}

export interface LlmClient {
  complete(request: LlmRequest): Promise<string | null>;
}

let modelNotFoundLogged = false;
let modelUnavailable = false;
let modelSucceeded = false;
let cachedReadyProbe: { ok: boolean; checkedAt: number } | null = null;

/** @testonly */
export function isLlmModelUnavailable(): boolean {
  return modelUnavailable;
}

/** Record llm success. */
export function recordLlmSuccess(): void {
  modelSucceeded = true;
  cachedReadyProbe = { ok: true, checkedAt: Date.now() };
}

/** @testonly */
export function resetLlmAvailabilityForTests(): void {
  modelNotFoundLogged = false;
  modelUnavailable = false;
  modelSucceeded = false;
  cachedReadyProbe = null;
}

/** Strip markdown code fences. */
export function stripMarkdownCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/** Handle groq model error. */
export function handleGroqModelError(status: number, model: string, bodyText = ''): boolean {
  const isNotFound =
    status === 404 ||
    /not found|model_not_found|does not exist|decommissioned|NOT_FOUND/i.test(bodyText);
  if (!isNotFound) return false;
  modelUnavailable = true;
  if (!modelNotFoundLogged) {
    modelNotFoundLogged = true;
    logger.error({ model, status, fallback: 'basic_mode' }, 'llmModelNotFound');
  }
  return true;
}

export class NullClient implements LlmClient {
  async complete(_request: LlmRequest): Promise<null> {
    return null;
  }
}

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function handleGroqFailure(
  res: Response,
  model: string
): Promise<{ text: null; retry: boolean }> {
  const errText = await res.text().catch(() => '');
  if (handleGroqModelError(res.status, model, errText)) return { text: null, retry: false };
  if (res.status === 429) cachedReadyProbe = { ok: false, checkedAt: Date.now() };
  const retry = res.status === 429 || res.status >= 500;
  if (!retry) logger.warn({ fallbackReason: `HTTP_${res.status}` }, 'llmRequestFailed');
  return { text: null, retry };
}

async function readGroqReply(
  res: Response,
  model: string
): Promise<{ text: string | null; retry: boolean }> {
  if (!res.ok) return handleGroqFailure(res, model);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? null;
  if (text) recordLlmSuccess();
  return { text, retry: false };
}

export class GroqClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_GROQ_MODEL
  ) {}

  private async attemptComplete(
    body: string,
    timeoutMs: number
  ): Promise<{ text: string | null; retry: boolean }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body,
        signal: controller.signal,
      });
      return await readGroqReply(res, this.model);
    } catch (error) {
      logger.warn(
        { fallbackReason: error instanceof Error ? error.name : 'unknown' },
        'llmRequestFailed'
      );
      return { text: null, retry: true };
    } finally {
      clearTimeout(timer);
    }
  }

  async complete(request: LlmRequest): Promise<string | null> {
    if (modelUnavailable) return null;
    const body = JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.prompt },
      ],
      max_tokens: Math.min(Math.max(request.maxTokens, 400), 2000),
      temperature: 0.2,
      ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const outcome = await this.attemptComplete(body, request.timeoutMs);
      if (outcome.text !== null || !outcome.retry || attempt === 1) return outcome.text;
      await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 100));
    }
    return null;
  }
}

/** Create llm client. */
export function createLlmClient(): LlmClient {
  const env = getEnv();
  const apiKey = env.GROQ_API_KEY;
  if (!env.LLM_ENABLED || !apiKey || modelUnavailable) return new NullClient();
  return new GroqClient(apiKey, env.GROQ_MODEL);
}

/** Check llm readiness. */
export async function checkLlmReadiness(): Promise<boolean> {
  const env = getEnv();
  if (!env.LLM_ENABLED || !env.GROQ_API_KEY || modelUnavailable) return false;
  if (modelSucceeded) return true;
  if (cachedReadyProbe && Date.now() - cachedProbeTime(cachedReadyProbe) < 300_000) {
    return cachedReadyProbe.ok;
  }

  try {
    const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages: [{ role: 'user', content: 'ok' }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      handleGroqModelError(res.status, env.GROQ_MODEL, body);
      cachedReadyProbe = { ok: false, checkedAt: Date.now() };
      return false;
    }
    recordLlmSuccess();
    return true;
  } catch {
    cachedReadyProbe = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

function cachedProbeTime(probe: { checkedAt: number }): number {
  return probe.checkedAt;
}
