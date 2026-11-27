# Security review status

**Status:** Both dependency audit commands completed on 2026-11-27 and reported zero vulnerabilities. This is not a penetration test or a deployment review; re-run the checks against the exact release commit.

## Controls to review

- Request schemas and payload size boundaries: `src/server/security/limits.ts`, `src/server/http/validate.ts`.
- Rate limiting and client-key handling: `src/server/security/rateLimit.ts`.
- Response headers: `src/proxy.ts`, `src/server/security/response.ts`, `next.config.mjs`.
- AI consent and server-only Groq access: `src/server/api/ask.ts`, `src/server/api/playbook.ts`, `src/server/llm/client.ts`.
- Security tests: `tests/integration/api-security.test.ts`, `tests/unit/security-boundaries.test.ts`, `tests/unit/rate-limit.test.ts`.

## Required checks for the exact release commit

```powershell
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
npm run build
```

Also verify the deployed HTTPS, secret configuration, response headers, and rate-limit behavior. Current rate limits and caches are in-memory and per process; they are not shared across replicas. A passing test suite is not a substitute for these release checks.
