# Execution: Results Center platform reporting guide

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-reporting-guide` |
| **Status** | shipped (automated gates green; HITL deferred) |
| **Date** | 2026-09-11 |

---

## Automated verification

| Gate | Command | Result |
|---|---|---|
| Persona service | `npm run test -- --testPathPattern="platform-reporting-guide.service.spec"` | PASS |
| Guide component | `npm run test -- --testPathPattern="results-center-reporting-guide.component.spec"` | PASS |
| RC hero wiring | `npm run test -- --testPathPattern="results-list.component.spec"` | PASS |
| SP modal regression | `npm run test -- --testPathPattern="where-to-report-modal.component.spec"` | PASS |

---

## Implementation summary

| Task | Deliverable |
|---|---|
| RCG-T-1 | `platform-reporting-guide.service.ts` + table-driven persona tests |
| RCG-T-2 | `ResultsCenterReportingGuideComponent` — guide-only lanes, program picker |
| RCG-T-3 | Hub embed via `ReportingEntryHubComponent`; `EntityAowService` priming; no `returnTab` |
| RCG-T-4 | Hero **Where to report** CTA on Results Center |
| RCG-T-5 | HITL matrix below — **pending human sign-off** |

---

## HITL checklist (≥900px)

| Persona | Steps | Pass |
|---|---|---|
| SP + Center | Open RC → Where to report → hub loads → W3 shows projects or centers | ☐ |
| SP only | W3 shows `no-centers` + Request access | ☐ |
| Center only, no SP | Guide-only W3 explainer + Science Programs link | ☐ |
| No associations | Guide-only both lanes; no AoW fetch | ☐ |
| Admin multi-SP | Picker lists my + other programs → hub after Continue | ☐ |
| SP band regression | SP01 band Where to report unchanged | ☐ |
| Keyboard | Escape closes RC guide; focus trapped in dialog | ☐ |
| Visual parity | RC guide vs SP01 modal side-by-side | ☐ |

---

## Known gaps

- Visual layout parity has no automated gate — HITL side-by-side required (requirements §9).
- Focus trap relies on `app-pr-dialog` behavior — keyboard smoke in HITL only.
