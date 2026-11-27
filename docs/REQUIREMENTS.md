# Requirements and current evidence

This table maps the supplied problem statement and judging criteria to current application areas. It is not a certification; commands and human review listed in the evaluation pack must be run on the commit being submitted.

| Requirement | Current implementation | Verification evidence |
|---|---|---|
| Location-aware air-quality context | `src/features/hero/`, `src/server/api/cityScenario.ts`, `src/server/providers/` | `tests/unit/provider-resilience.test.ts`, `tests/unit/api-city-scenario.test.ts` |
| Household/lifestyle personalization | `src/features/profile/`, `src/domain/playbookEngine.ts`, `src/domain/rules/` | `tests/unit/profile.test.ts`, `tests/unit/playbook-engine.test.ts`, `tests/unit/rules-engine.test.ts` |
| Low-emission routines and alternatives | `src/domain/catalog/actions.today.ts`, `src/domain/catalog/actions.alternatives.ts` | `tests/unit/catalog.test.ts`, `tests/unit/emissions.test.ts` |
| Indoor-air suggestions | `src/domain/catalog/actions.indoors.ts` | `tests/unit/catalog.test.ts`, `tests/unit/playbook-engine.test.ts` |
| Direct impact explanation | `src/domain/impact/`, `src/domain/impact-model.ts`, catalog source notes | `tests/unit/impact.test.ts`, `tests/unit/impact-model.test.ts` |
| Community use | `src/features/community/`, `src/domain/community.ts` | `tests/unit/community.test.ts`, `tests/unit/community-calc.test.ts`, `tests/unit/api-bulletin.test.ts` |
| Optional GenAI | `src/server/llm/`, `src/server/api/ask.ts`, `src/server/api/playbook.ts` | `tests/unit/llm-grounding.test.ts`, `tests/unit/ai-guardrails.test.ts`, `tests/unit/api-ai-consent.test.ts` |
| Safety, reliability, and privacy | `src/server/security/`, `src/server/http/`, browser-local profile state | `tests/integration/api-security.test.ts`, `tests/unit/security-boundaries.test.ts`, `tests/unit/provider-resilience.test.ts` |
| Accessibility | Semantic React UI, visible focus, responsive layout, Playwright axe coverage | `tests/e2e/a11y.spec.ts`; manual checks remain in `ACCESSIBILITY.md` |

## Explicit scope limits

- There is no photo-audit endpoint in the current app.
- Community pinboard and pledges are local to the current browser; they are not synchronized community data.
- Impact values are estimates with uncertainty and sources; they are not measured household outcomes.
- Live providers and the Groq-backed path require network/service availability; basic deterministic behavior is available without a Groq key.
- No hosted demo URL or human screen-reader sign-off is currently recorded in the repository.
