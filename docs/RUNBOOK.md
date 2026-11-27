# Deployment and operations runbook

This is a checklist for a future deployment, not evidence that the app is currently in production. The application uses Next.js standalone output and can run in the Docker image described by `Dockerfile`.

## Health and diagnostics

- Liveness endpoint: `GET /api/health`.
- Readiness endpoint: `GET /api/ready`.
- Structured server logs are emitted by `src/server/logging/logger.ts`; inspect logs for request identifiers and provider/LLM fallback events.
- Air-quality and LLM caches and rate limits are in-memory and process-local. Horizontal scaling does not share these values.

## Release checklist

1. Set Node.js 24 runtime and production environment variables; store `GROQ_API_KEY` only in the platform's secret manager.
2. Run `npm ci`, `npm run check`, `npm run build`, both `npm audit` commands in `docs/SECURITY_AUDIT.md`, and `npm run test:e2e`.
3. Build and start the Docker image in a container-capable CI runner.
4. Run `node scripts/smoke.mjs` against the running service and inspect response security headers.
5. Record the deployed URL, exact commit, test results, dependency audit result, and any remaining manual accessibility checks.

## Rollback

Use the hosting provider's documented revision/rollback mechanism to restore the previous known-good image or deployment revision. After rollback, repeat health/readiness and smoke checks. No rollback rehearsal is claimed until it has actually been run in the target environment.
