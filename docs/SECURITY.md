# Security and privacy

This document describes controls visible in the current source. It is not a penetration test, dependency audit, or guarantee of deployment security.

## Threat model

| Asset / Surface | Threat | Mitigation |
|---|---|---|
| `GROQ_API_KEY` | Secret exfiltration to client bundle | Read only in `src/server/config/env.ts`; never prefixed with `NEXT_PUBLIC_`; never logged. |
| LLM endpoints (`/api/ask`, `/api/playbook`, `/api/bulletin`) | Prompt injection, XSS, fabricated numbers, or off-topic abuse | Explicit `<user_city_data>` / `<user_question>` delimiters, bounded input lengths (`src/server/security/limits.ts`), `containsInjection` refusal, `areNumbersGrounded` numeric check, URL/medical-advice guardrails, React text rendering (no `dangerouslySetInnerHTML`). |
| Public API routes | Abuse / upstream quota exhaustion | Per-process in-memory token-bucket rate limiting (`src/server/http/withApiGuards.ts`), Zod schema validation, body size caps, 5xx fallback to deterministic engine. |
| Upstream APIs (Open-Meteo, WAQI) | Slowloris / hanging connections / malformed responses | `AbortSignal.timeout`, circuit breaker (`src/server/http/resilience.ts`), Zod response validation, LRU cache (`CACHE_TTL_MS`). |
| Browser transport & framing | Clickjacking, MIME sniffing, inline script/style injection | Nonce-based CSP (`script-src 'self' 'nonce-...' 'strict-dynamic'`, `style-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Strict-Transport-Security` in production, `poweredByHeader: false`. |

## Known limitations

- **Client-asserted `aiConsent`:** Because VayuSaathi has no user accounts or server-side session database, `/api/ask`, `/api/playbook`, and `/api/bulletin` rely on the `aiConsent: true` boolean sent by the client. A direct API caller can set `aiConsent: true` without interacting with the browser modal; rate limiting and input/output guardrails still apply.
- **In-memory rate limits:** Token-bucket counters live in Node.js process memory (`src/server/security/rateLimit.ts`), so multi-replica deployments do not share counters across instances.

## Privacy

There are no user accounts or application database. Profile, consent, and community UI state is stored in browser `localStorage`. Location and air-quality queries are sent to upstream data providers (coordinates rounded to 2 decimal places); when AI is allowed, the question and relevant air-quality/playbook context are sent to Groq. See the in-app [Privacy & Data Notice](/privacy) before sharing personal information.

## Before release

Run `npm audit --omit=dev --audit-level=high` and `npm audit --audit-level=high`, review the current CI secret-scan results, and verify deployment secrets and headers. Review `src/server/security/` and `tests/integration/api-security.test.ts` when changing API boundaries.
