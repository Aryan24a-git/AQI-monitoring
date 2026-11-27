# Problem-to-code traceability

This concise map reflects the current repository. The command results and explicit limitations in [EVALUATION_PACK.md](../EVALUATION_PACK.md) are the current verification record; old generated status ledgers are not authoritative.

| Problem objective | Main implementation | Focused tests |
|---|---|---|
| Tailor guidance to location and air conditions | `src/server/api/cityScenario.ts`, `src/server/providers/`, `src/domain/naqi.ts` | `tests/unit/api-city-scenario.test.ts`, `tests/unit/naqi.test.ts`, `tests/unit/provider-resilience.test.ts` |
| Tailor routines to family and lifestyle | `src/domain/playbookEngine.ts`, `src/domain/rules/`, `src/features/profile/` | `tests/unit/playbook-engine.test.ts`, `tests/unit/profile.test.ts`, `tests/unit/rules-engine.test.ts` |
| Suggest indoor protection and lower-emission choices | `src/domain/catalog/`, `src/domain/emissions.ts` | `tests/unit/catalog.test.ts`, `tests/unit/emissions.test.ts`, `tests/unit/ventilation.test.ts` |
| Explain impact with uncertainty and source notes | `src/domain/impact/`, `src/domain/impact-model.ts`, `src/catalog/catalog.json` | `tests/unit/impact.test.ts`, `tests/unit/impact-model.test.ts`, `tests/unit/catalog.test.ts` |
| Support community action | `src/features/community/`, `src/domain/community.ts` | `tests/unit/community.test.ts`, `tests/unit/community-calc.test.ts`, `tests/unit/api-bulletin.test.ts` |
| Offer grounded, optional GenAI | `src/server/llm/`, `src/server/api/ask.ts`, `src/server/api/playbook.ts` | `tests/unit/llm-grounding.test.ts`, `tests/unit/ai-guardrails.test.ts`, `tests/unit/api-ai-consent.test.ts` |
| Protect users and remain usable on failure | `src/server/security/`, `src/server/http/`, `src/features/layout/` | `tests/integration/api-security.test.ts`, `tests/unit/provider-resilience.test.ts`, `tests/unit/rate-limit.test.ts` |
| Keep interface accessible | `src/features/`, `src/app/globals.css` | `tests/e2e/a11y.spec.ts`; manual keyboard/screen-reader review is still required |

There is no photo-upload/photo-audit feature or synchronized community feed in the current implementation.
