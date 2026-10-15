# Archive Summary — Portfolio Overview: Results by typology

**Outcome:** delivered. `/portfolio-overview` has a new **Results by typology** section between the status section and the matrix:
- three level cards (Output · Outcome · Impact, plus Unclassified when it is > 0);
- a Spartan Tabs switch between **By Program / Accelerator** (all sources) and **By Center (W3/Bilateral)** (lead Center only);
- rows A→Z with a proportional level bar.

On P25 the figures reconcile live: 616 + 355 + 0 = 971 = Total, the P/A rows sum to 971, and the Center rows sum to 555 = the W3/Bilateral card. Committed as `e68016663` on `qa-development-2026-ss`.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/portfolio-overview-revamp/typology-view/` |
| Parent | `changes/portfolio-overview-revamp` (family #4) |
| Archive Date | 2026-10-15 |
| Final Status | **Done**: 4 / 4 tasks `[x]` |
| Branch | `qa-development-2026-ss` (spec branch; default is `master`) |
| Kaizen entry | `docs/specs/kaizen/changes--portfolio-overview-revamp--typology-view.md` |

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| TYV-R-1 one level per row | T-1 `levelOf` (fixed map, case/space-insensitive) | S-1.1–S-1.3 specs; live Unclassified = 0 |
| TYV-R-2 level cards | T-1 `levelCards`, T-2 view | S-2.1/S-2.2 specs; live 616 / 63 %, 355 / 37 %, Impact 0 "No results at this level" |
| TYV-R-3 dimension switch | T-2 Spartan Tabs | Cards unchanged on switch (falsifier); live keyboard Tab + ArrowRight, `aria-selected` |
| TYV-R-4 by P/A | T-1, T-2 | S-4.1–S-4.3 specs; live 14 rows = 971 |
| TYV-R-5 by lead Center, W3 only | T-1, T-2 | S-5.1 falsifier (W1/W2 IITA excluded); live 14 rows = 555 = W3 card; note shown |
| TYV-R-6 bar | T-2 | `aria-hidden`, no segment at 0, `min-w-[4px]`; fills ≥ 3:1 measured live |
| TYV-R-7 states | T-3 | Loading skeleton / figures DOM order / error / empty page specs |
| TYV-R-8 no click targets | T-2 | No `a` / `button` / `role=link` in cards or rows |
| NFR copy, tokens, a11y, responsive, folder docs | T-2, T-3, T-4 | Copy file; `var(--pr-*)` only; 375 / 768 / 1280 iframes; guide at 120 lines |

## Files Changed

| File | Change |
|---|---|
| `components/typology-block/typology.aggregate.ts` (+ spec) | New: pure `levelOf`, `levelCards`, `breakdownByProgram`, `breakdownByCenter` |
| `components/typology-block/typology-block.component.{ts,html}` (+ spec) | New: standalone OnPush block, Spartan Tabs, table, bar, `max-sm:` tab fit |
| `services/portfolio-overview.service.ts` | `RawResult.lead_center?`, `readonly openRows` |
| `portfolio-overview.component.{ts,html}` (+ spec) | Import, slot inside `hasFigures()`, typology skeleton |
| `internationalization/portfolio-overview.copy.ts` | +19 keys |
| `tests/mocks/spartanBrainMock.ts` | `BrnTabs.activationMode` (NG0311) |
| `portfolio-overview/CLAUDE.md` | "Results by typology" section, trimmed to 120 lines, re-stamped |

Total: 17 files, +1585 / −21 (incl. spec docs). Code + tests ≈ 730 LOC vs a 450 estimate. The 650 tripwire was raised after T-2, and the user said to continue.

## Test Evidence

| Check | Result |
|---|---|
| Jest `typology` + `portfolio-overview.component.spec` (`--maxWorkers=2`) | 40 typology + 82 page/typology green; every new case red first |
| Mock consumers (`centers-block`, page spec) | 92 / 92 green |
| Lint | `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` clean on touched TS files; 5 pre-existing `no-input-rename` errors in `spartanBrainMock.ts` |
| Browser (T-4, local, read-only) | PASS after the T-2 reopen; evidence in `execution.md` |

## Validation Summary

There is no `test-report.md` or `validation-report.md`. The spec ran Leader → Implementer → Reviewer per task plus the T-4 HITL browser check. The user approved committing and archiving with that evidence (2026-10-15).

Review history:
- Reviewer FAIL → rework: T-2 (page-wide Unclassified column) and T-3 (guide over the 120-line cap).
- T-4 live finding: tab-list overflow at 375 px, fixed by reopening T-2.
- 0 HALT, 0 pivot.

## Accepted Warnings / Follow-ups

- [ ] PRTest smoke after the commit reaches `performance-refactor` (reference: 971 / 971 / 555, Unclassified 0).
- [ ] The ≥ 4 px segment clamp is not exercisable on real data (no tiny segments; Impact is 0 page-wide).
- [ ] Advisory: the `typology.aggregate.spec.ts:126` case name still says "page-wide".
- [ ] Advisory: the Unclassified fill `--pr-color-neutral-800` is mauve-tinted. If that is off-brand, amend design §7.5 instead of swapping the token silently.
- [ ] Advisory: the guide trim dropped two plain facts from the Centers block (unused dead centre code; Center Overview reachable from the W3 module header).
- [x] Shell topbar 375 px overflow, fixed separately by `quick/topbar-right-375-overflow` (`b37d6287c`).
- [ ] `codegraph sync`.

## Historical Notes

- Level comes from the result-type name, not `result_level_name` (TYV-DD-3). Impact is 0 on P25 because there are no `Impact contribution` results, not because of a bug.
- The Center dimension is lead-only and W3-only (555). It intentionally differs from the CGIAR Centers block (712), which counts a shared result once per Center. The on-screen note says so.
