import { logger } from '../logging/logger';

export type ProviderErrorCode =
  'TIMEOUT' | 'HTTP_ERROR' | 'SCHEMA_ERROR' | 'NETWORK_ERROR' | 'CIRCUIT_OPEN';

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface ResilienceOptions {
  timeoutMs: number;
  maxRetries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
}

const ALLOWED_HOSTS = new Set([
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'api.waqi.info',
]);

export function assertAllowedUpstream(url: URL): void {
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new ProviderError('HTTP_ERROR', 'Outbound host is not allowlisted');
  }
}

export async function fetchWithTimeout(
  url: URL,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  assertAllowedUpstream(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url.toString(), { method: 'GET', signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ProviderError('TIMEOUT', 'Upstream request timed out', error);
    }
    throw new ProviderError('NETWORK_ERROR', 'Upstream network request failed', error);
  } finally {
    clearTimeout(timer);
  }
}

async function tryOnce(
  operation: () => Promise<Response>,
  isLast: boolean
): Promise<Response | null> {
  try {
    const response = await operation();
    if (response.ok || (response.status < 500 && response.status !== 429)) return response;
    if (isLast) throw new ProviderError('HTTP_ERROR', `Upstream returned ${response.status}`);
    return null;
  } catch (error) {
    if (!isLast) return null;
    throw error instanceof ProviderError
      ? error
      : new ProviderError('NETWORK_ERROR', 'Upstream request failed', error);
  }
}

/** Retries transient 429/5xx/network upstream failures with exponential backoff. */
export async function retryWithBackoff(
  operation: () => Promise<Response>,
  options: ResilienceOptions
): Promise<Response> {
  const retries = options.maxRetries ?? 2;
  for (let attempt = 0; ; attempt += 1) {
    const res = await tryOnce(operation, attempt >= retries);
    if (res) return res;
    await sleep((options.baseDelayMs ?? 200) * 2 ** attempt + Math.random() * 100);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  openMs?: number;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions = {}) {}

  get isOpen(): boolean {
    const openMs = this.options.openMs ?? 30_000;
    if (this.openedAt === 0) return false;
    if (Date.now() - this.openedAt >= openMs) return false;
    return true;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      logger.warn({ counter: 'breakerOpen' }, 'breakerOpen');
      throw new ProviderError('CIRCUIT_OPEN', 'Circuit breaker is open');
    }
    try {
      const value = await operation();
      this.failures = 0;
      this.openedAt = 0;
      return value;
    } catch (error) {
      this.failures += 1;
      const threshold = this.options.failureThreshold ?? 5;
      if (this.failures >= threshold) this.openedAt = Date.now();
      throw error instanceof ProviderError
        ? error
        : new ProviderError('NETWORK_ERROR', 'Provider operation failed', error);
    }
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = 0;
  }
}

export async function fetchValidatedJson<T>(
  url: URL | string,
  parse: (raw: unknown) => T,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    baseDelayMs?: number;
    fetchImpl?: typeof fetch;
  }
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 4_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const targetUrl = typeof url === 'string' ? new URL(url) : url;
  const response = await retryWithBackoff(() => fetchWithTimeout(targetUrl, timeoutMs, fetchImpl), {
    timeoutMs,
    maxRetries: options.maxRetries ?? 2,
    baseDelayMs: options.baseDelayMs ?? 200,
    fetchImpl,
  });
  if (!response.ok) {
    throw new ProviderError('HTTP_ERROR', `Upstream returned ${response.status}`);
  }
  let raw: unknown;
  try {
    raw = await response.json();
  } catch (error) {
    throw new ProviderError('SCHEMA_ERROR', 'Upstream returned malformed JSON', error);
  }
  return parse(raw);
}
