# Testing

## Available checks

| Command | Scope |
|---|---|
| `npm run check` | Prettier, ESLint, TypeScript, Knip, Madge, unit and integration tests |
| `npm run test:unit` | Unit tests in `tests/unit/` |
| `npm run test:integration` | Integration tests in `tests/integration/` |
| `npm run test:coverage` | Unit-test coverage report |
| `npm run test:e2e` | Playwright journeys across desktop, tablet, and mobile projects |
| `npm run build` | Production Next.js build and static asset copy |
| `npm run smoke` | HTTP smoke checks against a running server |

Run `npm ci` first with Node.js 24.x. `npm run check` does not run Playwright, build, smoke, or dependency-audit checks; report those separately.

## Latest locally observed result

On 2026-11-27, `npm run check` exited successfully: formatting, TypeScript, Knip, and Madge completed; Vitest reported **33 files and 148 tests passed**. ESLint had zero errors and **65 warnings**. `npm run build` succeeded with non-blocking React 18 deprecation and custom `Cache-Control` warnings. `npm run test:e2e` reported **64 passed and 2 skipped** across desktop, tablet, and mobile; automated axe checks found no critical or serious violations. Both dependency audits reported zero vulnerabilities. `npm run validate:catalog` accepted all 26 actions and flagged 6 for D3 review.

These are local results, not a deployed-service smoke test or a claim that the remaining manual keyboard, screen-reader, and contrast checks passed. Re-run the checks against the final submission commit.

## Accessibility

Automated axe checks are part of the Playwright suite. In addition, follow the manual keyboard and screen-reader checklist in [ACCESSIBILITY.md](./ACCESSIBILITY.md); do not mark those human checks complete based solely on automated results.
