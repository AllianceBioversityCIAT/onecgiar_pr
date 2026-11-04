# Archive Summary — Portfolio Overview: Funding source filter (`PFF`)

**Outcome:** Portfolio Overview has a 6th global filter, "Funding source" (W1/W2 · W3/Bilateral). It is mirrored in the URL, keeps single-source blocks' figures with a "Not affected by" note, and carries `funding` on Results Center links. All 3 tasks `[x]`; visual check confirmed by the user. Client only, uncommitted.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/funding-filter` |
| Parent | `changes/portfolio-overview-feedback-round` (family child #2) |
| Archive Date | 2026-11-04 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete** — 3/3 `[x]`, HITL visual check confirmed 2026-11-04 |
| Commit | none yet (working tree; commit on user go-ahead) |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-feedback-round/funding-filter/`

## 3. Requirements Delivered

| Req | Delivered by |
|---|---|
| PFF-R-1 options, last, chip, Clear all, never waits for the map | T-1, T-2, T-3 (layout) |
| PFF-R-2 filter matches deck W3 rule (`fundingOf`) | T-1 |
| PFF-R-3 URL codec, unknown dropped, mirror writes/removes | T-1, T-2 |
| PFF-R-4 value-dependent not-affected, figures unchanged | T-1, T-2 |
| PFF-R-5 Results Center link with `funding` ≤ 1 | T-1, T-2 |
| PFF-R-6 guide kept true | T-3 |

## 4. Files Changed Summary

| Task | Attempts | Files (under `onecgiar-pr-client/src/app/`) |
|---|---|---|
| T-1 | 1 | `portfolio-overview/services/portfolio-filters.ts`, `…/portfolio-overview.service.ts`, `internationalization/portfolio-overview.copy.ts` + 2 specs (+136/−23) |
| T-2 | 1 | `…/centers-block/centers-block.aggregate.ts`, `…/filter-bar/filter-bar.component.ts`, `…/portfolio-overview.component.ts`, `internationalization/portfolio-centers-block.copy.ts` + 4 specs |
| T-3 | 2 | `portfolio-overview/CLAUDE.md` (128 → 112 lines); parent `family.md` |

**Budget (3 tasks · ~260 LOC · 1 round/task):** tasks ✓; LOC ≈ 265 ✓; review rounds 4 vs 3 — T-3 rework (condensing dropped the `entity-details` navigation line).

## 5. Test Evidence Summary

| Run | Result |
|---|---|
| `jest --testPathPattern="portfolio-filters\|portfolio-overview.service"` (2 workers) | 2 suites, 100/100 |
| `jest --testPathPattern="centers-block\|filter-bar\|portfolio-overview.component"` | 15 suites, 380/380 |
| `jest --findRelatedTests` on all 7 changed source files | 32 suites, 1115/1115 |
| eslint on touched files (`ESLINT_USE_FLAT_CONFIG=false`) | clean |

## 6. Validation Summary

No `test-report.md` / `validation-report.md`; absence accepted by the user ("vamos con el archive"). Substitutes: Reviewer PASS per task in `execution.md` and the user's HITL visual check (desktop + mobile sheet).

## 7. Accepted Warnings Or Follow-Ups

- [ ] Commit (explicit paths) on user go-ahead.
- [ ] `typology.aggregate.ts` and `results-detail.rows.ts` still carry their own W3 string test → move to `fundingOf` (quick change).
- [ ] Assert "N of M" and sheet trigger count after a funding selection.
- [ ] Drop the `if (filterSE)` guard in the w1w2 link test.
- [ ] `npm run test:local` printed no output in this run; agents used `npx jest --maxWorkers=2` directly.
- [ ] Pre-existing guide inconsistency: sub-switch line vs ToC KPI section (`hasFigures()`).
- [ ] CodeGraph sync.

## 8. Historical Notes

- PFF-DD-1 (one classifier) chosen so the filtered total always equals the W3 card.
- Funding placed last in the bar (PFF-DD-4); "first" was left open for the user.
