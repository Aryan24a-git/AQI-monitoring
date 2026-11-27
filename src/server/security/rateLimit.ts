import { createHash, randomUUID } from 'crypto';
import { getEnv } from '../config/env';

export interface BucketStore {
  get(key: string): TokenBucket | undefined;
  set(key: string, value: TokenBucket): void;
}

export interface TokenBucket {
  tokens: number;
  lastRefillMs: number;
}

export class MemoryBucketStore implements BucketStore {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly maxEntries = 10_000,
    private readonly ttlMs = 10 * 60_000
  ) {}

  get size(): number {
    return this.buckets.size;
  }

  get(key: string): TokenBucket | undefined {
    const entry = this.buckets.get(key);
    if (!entry) return undefined;
    // Refresh insertion order for LRU behavior
    this.buckets.delete(key);
    this.buckets.set(key, entry);
    return entry;
  }

  set(key: string, value: TokenBucket): void {
    if (this.buckets.has(key)) {
      this.buckets.delete(key);
    } else if (this.buckets.size >= this.maxEntries) {
      this.prune(value.lastRefillMs);
      while (this.buckets.size >= this.maxEntries) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey === undefined) break;
        this.buckets.delete(oldestKey);
      }
    }
    this.buckets.set(key, value);
  }

  private prune(nowMs: number): void {
    for (const [k, v] of this.buckets) {
      if (nowMs - v.lastRefillMs > this.ttlMs) {
        this.buckets.delete(k);
      }
    }
  }

  clear(): void {
    this.buckets.clear();
  }
}

export class TokenBucketLimiter {
  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly store: BucketStore = new MemoryBucketStore(),
    private readonly globalLimit = Math.max(limit * 20, 200)
  ) {}

  private consumeBucket(
    key: string,
    maxTokens: number,
    nowMs: number
  ): { allowed: boolean; retryAfterSeconds: number } {
    const bucket = this.store.get(key) ?? { tokens: maxTokens, lastRefillMs: nowMs };
    const elapsed = Math.max(0, nowMs - bucket.lastRefillMs);
    const refill = (elapsed / this.windowMs) * maxTokens;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refill);
    bucket.lastRefillMs = nowMs;
    if (bucket.tokens < 1) {
      this.store.set(key, bucket);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil(((1 - bucket.tokens) * this.windowMs) / maxTokens / 1000)
        ),
      };
    }
    bucket.tokens -= 1;
    this.store.set(key, bucket);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  check(key: string, nowMs = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const clientRes = this.consumeBucket(key, this.limit, nowMs);
    if (!clientRes.allowed) return clientRes;
    return this.consumeBucket('__global__', this.globalLimit, nowMs);
  }
}

const salt = getEnv().CLIENT_IP_SALT || randomUUID();

export function getHashedClientKey(
  req: Request,
  trustedHeader = process.env['TRUSTED_PROXY_HEADER']
): string {
  if (!trustedHeader) {
    return createHash('sha256').update(`${salt}:shared-route-bucket`).digest('hex');
  }
  const headerVal = req.headers.get(trustedHeader);
  const parts = headerVal
    ? headerVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  // Use the LAST hop added by the trusted reverse proxy, not the client-spoofable first entry
  const raw = parts.length > 0 ? parts[parts.length - 1] : undefined;
  const ip = raw && raw.length <= 100 ? raw : 'unknown';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}
