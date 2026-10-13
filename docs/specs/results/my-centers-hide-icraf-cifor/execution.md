# Execution Log — `results/my-centers-hide-icraf-cifor`

## 1. Document Control

- **Spec:** `docs/specs/results/my-centers-hide-icraf-cifor/` (Lite)
- **Ticket:** P2-3852 · QA P2-3921
- **Branch:** `qa-development-2026-ss`
- **Started / completed:** 2026-10-08
- **Leader:** Opus 5.5 · Implementer: `akili-implementer` · Reviewer: `akili-reviewer` (checklist mode)

## 2. Task Execution History

### MYC-T-1 — Filter hidden centers from the My CGIAR Centers grid by phase year

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-08
- **Requirements covered:** MYC-R-1 (hide + badge count + case-insensitive acronym match), MYC-R-2 (2025 and `null`), MYC-R-3 (no `RolesService` change)
- **Skills assigned:** `angular-developer` · Effort: medium

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/result-framework-reporting-home.component.ts` — `HIDDEN_CENTERS_BY_PHASE_YEAR` (`2026 → ['ICRAF','CIFOR']`, P2-3852 + `@akili-spec` comments); `myCentersList` reads `reportingPhaseVersion()` and `rolesSE.rolesVersion`, filters by trimmed upper-cased `center_acronym`; null/unlisted year → list unchanged.
  - `…/result-framework-reporting-home.component.spec.ts` — ApiService stub gains `dataControlSE`; RolesService stub gains `rolesVersion`; 4 new cases (2026 → 1 with lower-case `cifor`; 2025 → 3; `null` → 3; source list still 3).
- **Red run:** spec-only change → 1/5 failed (`Expected length: 1, Received length: 3`, 2026 case).
- **Verification:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern=result-framework-reporting-home.component.spec` → `Tests: 5 passed, 5 total`.
- **Lint:** `npx eslint <files> --quiet` could not run (eslint 9 vs legacy `.eslintrc.json` in client — tooling issue). Substitute `npx ng lint --quiet --lint-file-patterns "<dir>/*.ts"` → `All files pass linting.`
- **Diff stat:** 2 files, 55+ / 1-. No `RolesService`, template or backend change.
- **Reviewer verdict:** `STATUS: PASS` — filter in component per DD-1, reactive via `reportingPhaseVersion()` + `rolesVersion` (`roles.service.ts:70-72`), single constant, DD-4 honored; Falsifier fully covered; Disqualifier not triggered (lower-case `cifor` really exercises case-insensitivity).

#### ADVISORY (4R, non-gating)

- RELIABILITY: `dataControlStub` is shared and mutated per case without reset; safe today (each case sets its year) but order-dependent for future cases that rely on the default. Suggest resetting it in the top-level `beforeEach`.
- READABILITY: bare `this.rolesSE.rolesVersion;` exists only to register a signal dependency — a one-line comment would protect it from cleanup.
- RISK (spec-acknowledged DD-2 / requirements §7): real `clarisa_institutions.acronym` values may differ from `ICRAF`/`CIFOR` (e.g. `CIFOR-ICRAF`). Covered only by the optional pre-flight check and QA on TEST (P2-3921).

#### Decisions / issues

- Implementer `Not Done / Assumptions`: did not run `ng build` (not in the task's verification list — not owed scope); new cases override `getMyCenters` on the injected stub via `as any` to keep the default CIMMYT-only list for the existing case. Leader accepted both.
- Lint command in tasks.md is not runnable with the client's current eslint setup; `ng lint` scoped run accepted as equivalent.
- Budget: 1 task, ~17 prod + ~39 test LOC, 1 review round — within budget.
- Not committed: commit requires user go-ahead (suggested subject in tasks.md DoD).

## 3. Summary

All tasks complete (1/1 PASS). Pending outside this run: commit on user go-ahead, push to `qa-development-2026-ss` → `performance-refactor`, QA P2-3921 on TEST, optional acronym confirmation in `clarisa_institutions`.

## Post-run: DD-2 acronym confirmation (2026-10-08)

User ran on the testing DB `clarisa_center cc LEFT JOIN clarisa_institutions ci ON ci.id = cc.institutionId` (the same join `RoleByUser.repository.ts:124-125` uses to produce `center_acronym`): `CENTER-04 → 115 CIFOR` and `CENTER-08 → 88 ICRAF`. No center maps to `CIFOR-ICRAF` (8714) or `WAICRAF` (6192). The constant matches as-is; the DD-2 risk is closed for testing. The production DB still needs the same check, or QA P2-3921 covers it.
