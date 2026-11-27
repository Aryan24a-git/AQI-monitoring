# Security and privacy

This document describes controls visible in the current source. It is not a penetration test, dependency audit, or guarantee of deployment security.

## Application controls

- API request bodies are size-bounded and parsed against Zod schemas in `src/server/security/limits.ts` and the API handlers.
- API routes use in-memory token-bucket rate limits. These limits are per process, so multiple replicas do not share counters.
- The Groq client and API key are server-side (`src/server/llm/client.ts`); the key must be supplied as `GROQ_API_KEY` and must never use a `NEXT_PUBLIC_` prefix.
- AI routes respect the explicit `aiConsent` request field. A request without consent uses the deterministic/basic response path.
- Output is schema-checked and rendered as React text rather than raw HTML.
- Deterministic and personalized plans apply action-safety filters; medication-timing advice is excluded, and cooking guidance that opens a window is withheld when outdoor AQI exceeds 100.
- Security headers and the CSP are configured in `next.config.mjs`, `src/proxy.ts`, and `src/server/security/response.ts`; verify headers against the deployed environment.

## Privacy

There are no user accounts or application database. Profile, consent, and community UI state is stored in browser local storage. Location and air-quality queries are sent to upstream data providers; when AI is allowed, the question and relevant air-quality/playbook context are sent to Groq. See the in-app [Privacy & Data Notice](/privacy) before sharing personal information.

## Before release

Run `npm audit --omit=dev --audit-level=high` and `npm audit --audit-level=high`, review the current CI secret-scan results, and verify deployment secrets and headers. Do not rely on old generated audit reports as current results. Review `src/server/security/` and `tests/integration/api-security.test.ts` when changing API boundaries.
