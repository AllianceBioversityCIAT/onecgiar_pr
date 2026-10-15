# Archive Summary — Portfolio Overview KPI Cards: New vs Replicated Breakdown (`POVKB`)

**Outcome:** delivered. The admin `/portfolio-overview` KPI deck now has 3 cards, and the "Science programs" card is gone.

| Card | Shows | Reconciles |
|---|---|---|
| Total | W1/W2 new, W3/Bilateral new, W1/W2 replicated, W3/Bilateral replicated | The 4 parts sum to the total |
| W1/W2 | New (Submitted / Editing) + Replicated from previous years | Submitted + Editing + Replicated = headline |
| W3/Bilateral | New (Submitted / Editing) + Innovations replicated from 2025 | Submitted + Editing + Replicated = headline |

All figures are derived on the client from the payload the page already loads. The user's SQL, run against the same database, matches the screen exactly in every bucket.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-overview-kpi-breakdown` |
| Parent family | `changes/portfolio-overview-revamp` (child #1) |
| Branch | `qa-development-2026-ss` |
| Implementation commit | `3c1f412c3` |
| Archived by | `/akili-archive` (Claude Code) |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-kpi-breakdown/`

## 3. Archive Date

2026-10-14

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 3 / 3 `[x]` |
| Reviewer verdicts | All PASS. T-2 needed 2 attempts; T-1 needed 1; T-3 is docs and was skip-eligible |
| HALT / Pivot / FATAL_FAIL | None |
| Budget | Estimated ~220 LOC; actual 333 changed lines (+267 / −66), under the 350 tripwire |
| `test-report.md` | **Absent, accepted.** The user approved archiving after the scoped Jest and visual evidence in §7 |
| `validation-report.md` | **Absent, accepted.** Reviewer gates, the user's screenshots at 4 widths, and the SQL cross-check (§8) cover it |

## 5. Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| POVKB-R-1: Total card, 4 reconciling parts, any flag encoding | T-1, T-2 | Encoding-matrix + invariant specs. Screen: 394 + 429 + 20 + 119 = 962 |
| POVKB-R-2: W1/W2 New (Submitted / Editing) + Replicated | T-1, T-2 | Screen: 35 + 359 + 20 = 414; matches SQL |
| POVKB-R-3: W3 New (Submitted / Editing) + Innovations replicated from 2025 | T-1, T-2 | Screen: 167 + 262 + 119 = 548; matches SQL |
| POVKB-R-4: 3 cards and 3 skeletons, Science programs gone, sm/lg layout | T-2, T-3 | Component spec; screenshots at 375 / 768 / 1280 / 1440 |
| POVKB-R-5: chips and click targets unchanged | T-2 | Existing specs green and unedited |
| POVKB-R-6: same rows, no extra request, zero-safe, closed-phase fallback | T-1, T-2 | Service tests 4–5; zero-W3 render test |

## 6. Files Changed Summary

| File | Task |
|---|---|
| `portfolio-overview/services/portfolio-overview.service.ts` (+ `.spec.ts`) | T-1 |
| `portfolio-overview/portfolio-overview.component.html` / `.ts` / `.spec.ts` | T-2 |
| `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (`BrnSeparator` inputs; accepted scope deviation) | T-2 |
| `portfolio-overview/CLAUDE.md` | T-3 |

## 7. Test Evidence Summary

| Check | Result |
|---|---|
| `npx jest --maxWorkers=2 --testPathPattern=portfolio-overview` | 6 suites, 121 / 121 passed |
| Red runs | T-1: 6 new tests failed before implementation. T-2: 3 failed before the template change |
| Lint (`ng lint --lint-file-patterns`, touched files) | Clean |

## 8. Validation Summary

- **Visual check.** The user took screenshots in an admin session at 375, 768, 1280 and 1440 px.
  - The layout follows the intended grid at every width.
  - Nothing is clipped.
  - The card-1 separator and labels are readable on the gradient.
- **Data cross-check.** An endpoint-equivalent SQL query matches every bucket:

  | Stream | Total | New | Submitted | Editing | Replicated |
  |---|---|---|---|---|---|
  | W1/W2 | 414 | 394 | 35 | 359 | 20 |
  | W3 | 548 | 429 | 167 | 262 | 119 |

## 9. Accepted Warnings Or Follow-Ups

- Prune the `PortfolioKpis` fields that are no longer rendered (design DD-4).
- If replicated W3 ever includes non-innovations, change card 3's label (premise P-3).
- Pre-existing and out of scope: at 1280 px the status strip truncates "Submi…" and "Discontin…".
- Advisories that were recorded but not actioned:
  - The `fig` helper is duplicated.
  - The spec's `rows()` helper shares a name with the service signal.
  - The separator test checks the count, not the position.

## 10. Historical Notes

- **T-2 attempt 1 FAIL.**
  - Card 1 had no separator: design §6 asks for one, but `tasks.md` listed the separator only under cards 2–3.
  - The fixture buckets were not pairwise distinct.
  - Both were fixed in attempt 2.
- **T-3's first visual check was inconclusive.** The local session's user (575) has the Guest role, and `CheckAdminGuard` redirected the page. The check was re-run with the user's admin session.
- **Data-check gotcha.** A raw `result` count is larger than the screen (444 / 744 vs 414 / 548). The endpoint only counts results with an active submitter initiative and excludes result types 10 and 11.
