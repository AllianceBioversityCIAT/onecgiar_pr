# Module Spec — `tasks.md`

## 1. Scope

- **Module / feature:** `results` / `my-centers-hide-icraf-cifor`
- **Linked spec:** `requirements.md` + `design.md` (same folder) · [P2-3852](https://cgiarmel.atlassian.net/browse/P2-3852)
- **Depth:** Lite · **Status:** `done`

## 2. Pre-flight

- [x] `requirements.md` approved (2026-10-08)
- [x] `design.md` approved (2026-10-08)
- [x] Optional: the acronyms `ICRAF`/`CIFOR` have been confirmed in `clarisa_institutions` (DD-2) — 2026-10-08 on testing: CENTER-04 → 115 `CIFOR`, CENTER-08 → 88 `ICRAF`. If they differ, update the constant before merging

## 3. Tasks

### [x] `MYC-T-1` — Filter hidden centers from the My CGIAR Centers grid by phase year

- **Type:** `client`
- **Description:** Add the `HIDDEN_CENTERS_BY_PHASE_YEAR` constant (`2026 → ['ICRAF','CIFOR']`, with a P2-3852 comment). Make `myCentersList` read `api.dataControlSE.reportingPhaseVersion()` and `rolesSE.rolesVersion`, then filter `rolesSE.getMyCenters()` by trimmed, upper-cased `center_acronym` for `reportingCurrentPhase.phaseYear`. With no entry for that year, or a `null` year, return the list unchanged. In the spec, extend the ApiService stub with `dataControlSE` (`reportingPhaseVersion`, `reportingCurrentPhase`) and add the cases listed in the test plan.
- **Implements:** MYC-R-1 (both clauses: hide + badge count; the case-insensitive acronym match), MYC-R-2 (2025 and `null`), MYC-R-3 (BUT clause: no change to `RolesService`)
- **Design refs:** design §8, DD-1, DD-2, DD-4
- **Files:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/result-framework-reporting-home.component.ts`, `…/result-framework-reporting-home.component.spec.ts`
- **Depends on:** — · **Blocks:** —
- **Estimate:** S · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** with the stub returning `[CIMMYT, ICRAF, cifor]` and `phaseYear = 2026`, a result that still contains ICRAF or `cifor`, or has a length other than 1, fails the task. With `phaseYear = 2025` or `null`, any length other than 3 fails it. Any diff line in `roles.service.ts` fails MYC-R-3.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern=result-framework-reporting-home.component.spec`. The new 2026 case fails before the change and passes after.
  - **Disqualifier:** if meeting the ACs needs a change to `RolesService`, the template or any backend file, stop and re-specify. The same applies if the test only passes because the stub is shaped to fit the filter (for example, acronyms already upper-cased), which would make the case-insensitive check untested.
  - **Not provable here:** that real production acronyms equal `ICRAF`/`CIFOR`. That is covered by the QA check on TEST (P2-3921).
  - **Consumers:** none (no shared symbol changed). `myCentersList` is read only by this component's template and spec.
- **Lint:** `cd onecgiar-pr-client && npx eslint <the 2 files> --quiet`
- **Definition of done:**
  - [x] Red run green; existing CIMMYT case still green
  - [x] Lint clean on both files
  - [x] `git diff --stat` shows only the 2 files above (plus spec docs)
  - [ ] Commit `🔧 fix(result-framework-reporting-home) [P2-3852]: hide ICRAF and CIFOR from My CGIAR Centers in Reporting 2026` (no apostrophes; commit only on user go-ahead)

## 4. Dependency graph

```
MYC-T-1 (single task)
```

## 5. Test plan

| Test | Covers | Location |
|---|---|---|
| 2026 hides ICRAF + lower-case `cifor`, keeps CIMMYT (length 1) | MYC-R-1 | component spec |
| 2025 shows all 3 | MYC-R-2 | component spec |
| `phaseYear = null` shows all 3 | MYC-R-2, DD-4 | component spec |
| `getMyCenters` stub still returns all 3 after reading the list in 2026 | MYC-R-3 | component spec |
| Manual: TEST, account with 16 centers, P25 Reporting 2026 → 14 cards, badge 14; switch to a 2025 phase → 16 | AC1–AC5 | QA P2-3921 |

## 6. Rollout

- [ ] Push to `qa-development-2026-ss` → `performance-refactor` for the PRTest deploy (~30 min), then QA re-verifies P2-3921
