# Archive Summary — Results Center platform reporting guide

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/results-center-reporting-guide` |
| Archive date | 2026-09-11 |
| Branch | `qa-development-2026` |
| Depth | Standard |

## Final Status

**Shipped** — RCG-T-1..T-4 complete; RCG-T-5 HITL deferred to owner QA. Scoped Jest green (115+ tests on reporting-guide pattern).

## Requirements Delivered

| ID | Outcome |
|---|---|
| RCG-R-1 | Hero **Where to report** CTA opens platform guide |
| RCG-R-2..R-9 | Persona modes, hub embed, guide-only lanes, emerging card, deep links |
| RCG-NFR-1..4 | Dialog a11y via `app-pr-dialog`; scoped Jest only |

## Files Changed

| Area | Files |
|---|---|
| Guide component | `results-center-reporting-guide/*`, `platform-guide-copy.ts` |
| Persona service | `platform-reporting-guide.service.ts` (+ spec) |
| RC host | `results-list.component.{html,ts,scss,spec.ts}`, `results-list.module.ts` |

## Test Evidence

```bash
npm run test -- --testPathPattern="platform-reporting-guide.service.spec|results-center-reporting-guide.component.spec|results-list.component.spec|where-to-report-modal.component.spec"
```

115 passed.

## Follow-ups

- HITL persona matrix in `execution.md` — owner QA
- Optional: filter AVISA (SGP-02) from admin picker catalog
