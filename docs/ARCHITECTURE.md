# Architecture

VayuSaathi is a Next.js App Router application with a browser UI, pure TypeScript domain logic, server-side API handlers, and external air-quality/LLM providers. It has no application database. Household preferences, consent choice, and community interactions are kept in browser storage.

## Runtime flow

1. `src/app/page.tsx` composes the dashboard and feature tabs.
2. `src/features/layout/` and `src/features/profile/` manage browser state and user actions.
3. `src/domain/` computes air-quality bands, playbooks, ventilation heuristics, and impact estimates.
4. `src/server/api/` validates requests, applies rate limits, and coordinates domain logic.
5. `src/server/providers/` retrieves air-quality and geocoding data. `src/server/llm/` optionally calls Groq from the server.

## Important boundaries

- **Deterministic first:** The catalog/rules-based guidance works without an LLM key. AI is an optional language/personalization layer, not a required data source.
- **Consent:** AI-backed requests carry an explicit `aiConsent` boolean; the server uses a null client when consent is false. The consent selection is stored in browser local storage.
- **External data:** Open-Meteo and WAQI are upstream providers. Provider availability, coverage, and freshness affect the displayed data; synthetic examples are labeled as demos.
- **Impact:** Values are sourced estimates with ranges and confidence labels, not sensor readings or guaranteed outcomes.
- **Privacy:** There is no user account or server-side profile database. Coordinates and user-provided information may be sent to the relevant provider when needed; consult the in-app privacy notice for the exact data flow.
- **Resilience:** Provider requests use timeouts/caching/fallbacks. Caches and token-bucket rate limits are in-memory and per process; they are not shared across multiple replicas.

## API routes

Implemented handlers live in `src/app/api/`: `air-quality`, `ask`, `bulletin`, `city-scenario`, `geocode`, `health`, `plan`, `plan/narrate`, `playbook`, and `ready`. The source route files and [API reference](./API.md) are authoritative. There is no photo-audit endpoint.

## Quality and deployment

`npm run check` runs formatting, ESLint, TypeScript, Knip, Madge, and Vitest. `npm run build` creates the Next.js standalone build; the Dockerfile uses Node 24 Alpine and a non-root runtime user. Run the build, Playwright E2E, dependency audits, and actual container deployment checks before making release claims.
