// Satisfies: TEST-001, NFR-003, DEP-003, SEC-002
import { describe, it, expect } from 'vitest';
import { DEFAULT_GROQ_MODEL, validateEnv } from '../../src/server/config/env';
import { RATE_LIMITS } from '../../src/server/security/limits';

describe('Server Environment Configuration', () => {
  it('validates environment with defaults and no LLM key provided', () => {
    const raw = {
      NODE_ENV: 'test',
      APP_ORIGIN: 'http://localhost:3000',
    };
    const env = validateEnv(raw);
    expect(env.NODE_ENV).toBe('test');
    expect(env.RATE_LIMIT_PLAN).toBe(RATE_LIMITS.planPerMinute);
    expect(env.GROQ_API_KEY).toBeUndefined();
    expect(env.GROQ_MODEL).toBe(DEFAULT_GROQ_MODEL);
    expect(env.GROQ_MODEL).toBe('openai/gpt-oss-120b');
  });

  it('fails fast on invalid values with clear diagnostics', () => {
    const raw = {
      RATE_LIMIT_PLAN: '-5',
    };
    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it('correctly accepts optional LLM keys', () => {
    const raw = {
      GROQ_API_KEY: 'test-groq-key',
      GROQ_MODEL: 'llama-3.1-8b-instant',
      LLM_DAILY_CALL_CAP: '500',
    };
    const env = validateEnv(raw);
    expect(env.GROQ_API_KEY).toBe('test-groq-key');
    expect(env.GROQ_MODEL).toBe('llama-3.1-8b-instant');
    expect(env.LLM_DAILY_CALL_CAP).toBe(500);
  });
});
