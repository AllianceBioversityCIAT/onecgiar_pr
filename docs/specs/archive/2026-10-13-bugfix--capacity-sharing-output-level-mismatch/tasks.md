# Module Spec — `tasks.md`

> Linked spec: `docs/specs/bugfix/capacity-sharing-output-level-mismatch/requirements.md` + `design.md`.

---

## 1. Scope of this task list

- **Module / feature:** `bilateral` — `bilateral-result-creator` breadcrumb level label
- **Linked spec:** `docs/specs/bugfix/capacity-sharing-output-level-mismatch/requirements.md` + `design.md`
- **Sprint / target phase (if any):** next available
- **Owner / driver:** Bilateral module
- **Status:** not-started

---

## 2. Pre-flight checklist

Conditions confirmed satisfied at spec-approval time (recorded here, boxes checked off during `/akili-execute` per the execution-evidence gate):

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] Open questions in `requirements.md` and `design.md` are all resolved — none exist (root cause and fix location are confirmed, not open).
- [ ] CLARISA dependencies — n/a, no CLARISA touch.
- [ ] No conflicting in-flight spec touching the same entities — confirmed: `docs/specs/bugfix/` and `docs/specs/bilateral/` scanned, no other spec touches `bilateral-result-creator.component.ts` or `resultLevelName`.
- [ ] Migration name and reversibility — n/a, no migration.

---

## 3. Task list

### `BIL-T-1` — Add a regression test for the inverted `resultLevelName` mapping `[x]` PASS (attempt 1) — see execution.md

- **Type:** `tests`
- **Description:** Add a `describe` block to `bilateral-result-creator.component.spec.ts` asserting `component.resultLevelName()` returns `'Outcome'` when `creationService.resultLevelId` is set to `3`, and `'Output'` when set to `4`. This test MUST be written and run against the **current (buggy)** code first to confirm it fails (red), per Bug Mode.
- **Implements:** `BIL-R-1`, `BIL-AC-1`, `BIL-AC-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `BIL-T-2`
- **Estimate:** `S`
- **Review:** `checklist` — touches a test file only, but asserts the exact regression behavior; not `skip-eligible` because it is the evidence the bug is real.
- **Verification:**
  - **Falsifier:** running the new test against the unmodified `bilateral-result-creator.component.ts` (HEAD, with `case 3: return 'Output'; case 4: return 'Outcome';`) MUST fail both assertions — `resultLevelId=3` returns `'Output'` instead of the asserted `'Outcome'`, and `resultLevelId=4` returns `'Outcome'` instead of the asserted `'Output'`. A test that passes against the unmodified file is not testing the bug.
  - **Red run:** `npx jest --testPathPattern="bilateral-result-creator.component.spec" -t "resultLevelName"` — MUST fail (red) before `BIL-T-2` is applied, confirming the regression is real and the test actually exercises it (not a setup/mock failure — the failure must be on the `expect(...).toBe(...)` assertion itself, per the assertion-level-red-run rule).
  - **Disqualifier:** if the test passes against the unmodified code (i.e., does not go red), the task is not done — re-check that `creationService.resultLevelId` is being set as a signal the computed actually reads (see existing pattern at `bilateral-result-creator.component.spec.ts:102`, `resultLevelId: signal(null) as any`) and that `TestBed.flushEffects()` is called if needed before reading `component.resultLevelName()`.
  - **Consumers:** none (no shared symbol changed — this task only adds a test).
- **Definition of done:**
  - [ ] Test added, confirmed **red** against current code (output captured in the PR description or execution log).
  - [ ] Lint clean (`npx ng lint --quiet`).
  - [ ] Commit per convention: `🔧 fix(bilateral-result-creator): add regression test for inverted result-level label`.

### `BIL-T-2` — Fix the inverted `resultLevelName` mapping `[x]` PASS (attempt 1) — see execution.md

- **Type:** `client`
- **Description:** Swap the `case 3` / `case 4` return values in `BilateralResultCreatorComponent.resultLevelName` (lines 197-211) so `3 → 'Outcome'` and `4 → 'Output'`, matching `ResultLevelEnum` and every other level mapping in the codebase. Do not touch `case 1` / `case 2` (out of scope, `BIL-P-5`).
- **Implements:** `BIL-R-1`, `BIL-AC-1`, `BIL-AC-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts`
- **Depends on:** `BIL-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist` — a two-line value swap in a pure computed, covered end-to-end by `BIL-T-1`'s test; not `skip-eligible` because it is the actual bug fix (not a pure mechanical rename), but does not warrant `full`/`lenses` (no shared contract, no migration, no auth).
- **Verification:**
  - **Falsifier:** after the fix, `resultLevelName()` for `resultLevelId=4` MUST return `'Output'` (not `'Outcome'`) and for `resultLevelId=3` MUST return `'Outcome'` (not `'Output'`). Reverting this task's diff MUST turn `BIL-T-1`'s test red again.
  - **Red run:** `npx jest --testPathPattern="bilateral-result-creator.component.spec" -t "resultLevelName"` — MUST pass (green) after this change, immediately following the confirmed red from `BIL-T-1`.
  - **Disqualifier:** if making this test green requires touching any file other than `bilateral-result-creator.component.ts`, or requires changing `case 1`/`case 2`, stop and re-specify — the premise that this is a contained, single-file, single-switch fix (`BIL-P-2`, `BIL-P-4`) would be false.
  - **Consumers:** `bilateral-page-header.component` via the `[resultLevelName]="resultLevelName()"` binding (`bilateral-result-creator.component.html:227`) — already covered by `bilateral-page-header.component.spec.ts:740`, which asserts the header renders whatever string it is given; that test does not need to change since the *contract* (a string or null) is unchanged, only which string is correct.
- **Definition of done:**
  - [ ] Code changed, `BIL-T-1`'s test now green.
  - [ ] Lint + format clean (`npx ng lint --quiet`).
  - [ ] `npx jest --silent --reporters=summary --no-coverage` run for the touched spec file — green, no regressions in the rest of `bilateral-result-creator.component.spec.ts` (it is a large, heavily-covered file — confirm no unrelated assertion broke).
  - [ ] No secret or token leaked in logs or messages.
  - [ ] No API surface changed — no Swagger/DTO update needed.
  - [ ] No UX/i18n change — the two labels (`'Outcome'`, `'Output'`) already existed in the file; no new string introduced.
  - [ ] No bilateral/platform-report payload change — no change-log entry needed.
  - [ ] Commit per convention: `🔧 fix(bilateral-result-creator): correct inverted result-level breadcrumb label (3=Outcome, 4=Output)`.

---

## 4. Dependency graph

```
BIL-T-1 (regression test, confirmed red)
   └── BIL-T-2 (swap case values, test goes green)
```

No parallel branches — this is a strict TDD pair (red → green) on one file.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BIL-TEST-1` | unit (client, Jest) | `BIL-R-1`, `BIL-AC-1`, `BIL-AC-2` | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts` |

No new integration/Cypress test — the one consumer (`bilateral-page-header`) is already independently tested for rendering an arbitrary input string (`bilateral-page-header.component.spec.ts:740`), per `design.md` §10.

Client coverage stays above 50/60/60/60 — this touches an already well-covered file (`bilateral-result-creator.component.spec.ts` has 20+ existing `describe` blocks) and adds coverage, never removes it.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build) — `migration:check:ci` is a no-op here (no migration), SonarCloud per standard gate.
- [ ] Manual QA on staging/test: create one W3/Bilateral result at Output level (e.g. Capacity Sharing for Development or Knowledge Product) and one at Outcome level (e.g. Policy Change), confirm the breadcrumb shows the correct label for each — reproducing and closing the original QA report (result #9803 pattern).
- [ ] No bilateral/platform-report payload change — no downstream consumer notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry — n/a, no new logging.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] Optional follow-up (not blocking): extract a shared `RESULT_LEVEL_LABELS`-style constant so `bilateral-result-creator.component.ts` cannot re-diverge from the canonical mapping if a new result level is ever added (`design.md` §13, DD-1 alternative 1). File as a separate small spec/kaizen item if the team wants it; not required by this bugfix.
- [ ] No `docs/prd.md` Open Questions resolved by this spec (none existed for this area).

---

## 8. Roll-back plan

1. Revert the PR for `BIL-T-1` + `BIL-T-2` (expected to land as one PR given the S+S size).
2. No migration to revert — none exists.
3. No feature flag introduced — none needed.
4. No bilateral/platform-report payload to verify — unaffected by this change in either direction.
5. No downstream consumers to notify — client-only display fix.

---

## Required cross-references

- `docs/specs/bugfix/capacity-sharing-output-level-mismatch/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- No authoritative module doc touched (bilateral payload contract unaffected).
