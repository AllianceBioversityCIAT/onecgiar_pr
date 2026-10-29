# Archive Summary — SP Overview "Total General" card

**Outcome:** shipped. The Total General card on the Science Program Overview now shows a **replicated + new** headline and three rows: replicated, new, and W3/Bilateral awaiting review. It is on `qa-development-2026-ss` (`3b1367cde`) and `performance-refactor` (ff to `5891f5fa5`). The user validated it locally.

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/sp-overview-total-general-card/` |
| Archive date | 2026-10-08 |
| Final status | **Done**, with accepted gaps (§9) |
| Branch | `qa-development-2026-ss` |
| Commit | `3b1367cde` |

## 2. Requirements delivered

| ID | Delivered | Evidence |
|---|---|---|
| STG-R-1 three rows (zero shown) | ✅ | Jest `program-overview.component.spec` · live SP01 8 / 160 / 33 |
| STG-R-2 headline = replicated + new | ✅ | Jest + mutation check (69 vs 78) · live KPI 1 168 = KPI 2 168 |
| STG-R-3 W3 volume line removed, KPI 3 intact | ✅ | Jest DOM assertion · live |
| STG-R-4 program-wide, per phase | ✅ | Jest phase switch + scope tests · live: scope AOW02 left KPI 1 at 168 |
| STG-R-5 pattern, skeleton, click | ✅ | Jest (meter and bilateral loading, click → `all`) |
| STG-NFR-1 no new request | ✅ | No `api.` call in the diff |
| STG-NFR-2/3/4 mono, a11y, truncation | ⚠️ partial | Classes asserted; truncation seen live only at a 298px card |

## 3. Files changed

| File | Change |
|---|---|
| `dashboard-lab.component.ts` / `.html` | `overviewTotalBreakdown` computed + `[totalBreakdown]` binding |
| `program-overview.component.ts` | `OverviewTotalBreakdown` type, input, `programResultsTotal` re-pointed |
| `program-overview.component.html` | KPI 1 rows, divider, chips, tooltips, 3rd skeleton bar |
| `*.spec.ts` (both) | +4 host tests, +6 card tests, `:885` and `:899` updated |
| `dashboard-lab/CLAUDE.md`, `program-overview/CLAUDE.md` | Notes + `Verified:` re-stamp |

## 4. Test evidence

- `dashboard-lab.component.spec`: 79 passed.
- `program-overview` pattern: 4 suites, 267 passed (all `--maxWorkers=2`).
- No `test-report.md`; `/akili-test` was not run (accepted).

## 5. Validation

- No `validation-report.md`; `/akili-validate` was not run (accepted).
- Substitutes:
  - T-3 live read-only check on SP01, against a fresh bundle (`ng.getComponent`).
  - The user's validation before the merge to `performance-refactor`.

## 6. Execution

| Task | Attempts | Note |
|---|---|---|
| T-1 | 1 | PASS |
| T-2 | 2 | Attempt 1: the "bilateral does not change the headline" test set an input that doesn't feed the formula |
| T-3 | 2 | Attempt 1: `dashboard-lab/CLAUDE.md` `Verified:` not re-stamped |

Budget: 5 review rounds against 1; ~190 LOC against ~140.

## 9. Accepted gaps / follow-ups

- [ ] `ng build` never ran (free RAM < 4 GB every time). The evidence is the dev-server AOT compile plus the PRTest deploy.
- [ ] Narrow-width (~360px) visual and the side-by-side with the center card were not agent-verified.
- [ ] No `test-report.md` / `validation-report.md` (the user accepted this 2026-10-08).
- [ ] CodeGraph `codegraph sync` is recommended.

## 10. Historical notes

- Implementation discovery: the meter `Version` already carries `replicatedResults` / `newResults`, so the proposal's Option A (counting `programResults`) was dropped at specify time.
- The same push also carried `5891f5fa5`, which removes the center Overview "Needs attention" KPI tile. It is out of scope for this spec and was done as a quick change.
