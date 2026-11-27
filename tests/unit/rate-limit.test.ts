import { describe, it, expect } from 'vitest';
import {
  MemoryBucketStore,
  TokenBucketLimiter,
  getHashedClientKey,
} from '../../src/server/security/rateLimit';

describe('Rate Limiter Security', () => {
  it('uses last proxy IP hop so spoofed upstream X-Forwarded-For values do not bypass limits', () => {
    const req1 = new Request('http://localhost/api/ask', {
      headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.50' },
    });
    const req2 = new Request('http://localhost/api/ask', {
      headers: { 'x-forwarded-for': '9.9.9.9, 203.0.113.50' },
    });
    expect(getHashedClientKey(req1, 'x-forwarded-for')).toBe(
      getHashedClientKey(req2, 'x-forwarded-for')
    );
  });

  it('uses one shared bucket when TRUSTED_PROXY_HEADER is unset', () => {
    const req1 = new Request('http://localhost/api/ask', {
      headers: { 'x-forwarded-for': '1.1.1.1' },
    });
    const req2 = new Request('http://localhost/api/ask', {
      headers: { 'x-forwarded-for': '2.2.2.2' },
    });
    expect(getHashedClientKey(req1, undefined)).toBe(getHashedClientKey(req2, undefined));
  });

  it('bounds MemoryBucketStore size after 20,000 distinct keys', () => {
    const store = new MemoryBucketStore(5_000, 60_000);
    const now = Date.now();
    for (let i = 0; i < 20_000; i += 1) {
      store.set(`key-${i}`, { tokens: 5, lastRefillMs: now });
    }
    expect(store.size).toBeLessThanOrEqual(5_000);
  });

  it('enforces global per-route ceiling across distinct keys', () => {
    const limiter = new TokenBucketLimiter(5, 60_000, new MemoryBucketStore(), 10);
    const now = 1_000_000;
    for (let i = 0; i < 10; i += 1) {
      expect(limiter.check(`client-${i}`, now).allowed).toBe(true);
    }
    expect(limiter.check('client-99', now).allowed).toBe(false);
  });
});
