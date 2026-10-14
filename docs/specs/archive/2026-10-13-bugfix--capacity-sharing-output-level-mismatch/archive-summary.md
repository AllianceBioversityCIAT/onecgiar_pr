# Archive Summary — Capacity sharing output/level mismatch (bilateral breadcrumb)

**Outcome:** Fixed. The W3/Bilateral breadcrumb was showing the inverted Result Level label (every bilateral result at level 3 or 4 showed the opposite of its actual level). Both tasks shipped, Reviewer-PASSed, and committed in `3c53f26b7`.

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/capacity-sharing-output-level-mismatch/`
- **Module:** `bilateral` — `bilateral-result-creator`
- **Depth:** Lite (Bug Mode)
- **Ticket(s):** none (QA finding, no P2 ticket)

## 2. Original Spec Path

`docs/specs/bugfix/capacity-sharing-output-level-mismatch/`

## 3. Archive Date

2026-10-13

## 4. Final Status

**Done.** Both tasks `[x]` PASS. Committed as `3c53f26b7`. PR not yet opened; manual QA on staging/test not yet run (out of session reach — see §9).

## 5. Requirements Delivered

| ID | Requirement | Status |
|---|---|---|
| `BIL-R-1` | Breadcrumb MUST show the label matching the canonical `result_level_id` mapping (3→Outcome, 4→Output) | ✅ Delivered |
| `BIL-AC-1` | `result_level_id=4` → `resultLevelName()` returns `'Output'` | ✅ Delivered, test-covered |
| `BIL-AC-2` | `result_level_id=3` → `resultLevelName()` returns `'Outcome'` | ✅ Delivered, test-covered |
| `BIL-US-1` | Submitter sees the level they actually selected, at creation time, on the detail breadcrumb | ✅ Delivered |

## 6. Files Changed Summary

(from `execution.md`)

| File | Change |
|---|---|
| `onecgiar-pr-client/.../bilateral-result-creator/bilateral-result-creator.component.spec.ts` | New `describe('resultLevelName (bugfix: capacity-sharing-output-level-mismatch)', ...)` block, 2 cases (`BIL-T-1`) |
| `onecgiar-pr-client/.../bilateral-result-creator/bilateral-result-creator.component.ts` | Swapped `case 3`/`case 4` return values in the `resultLevelName` computed; `case 1`/`case 2` untouched (`BIL-T-2`) |
| `onecgiar-pr-client/.../bilateral-result-creator/CLAUDE.md` | `Verified:` line re-stamped per `onecgiar-pr-client/CLAUDE.md` §10 folder-doc convention |

No server, migration, or API/payload files touched — confirmed display-only throughout.

## 7. Test Evidence Summary

- **Red (BIL-T-1, attempt 1):** `npx jest --testPathPattern="bilateral-result-creator.component.spec" -t "resultLevelName"` → 2 failed on the `expect(...).toBe(...)` assertion itself (`resultLevelId=3` → got `'Output'`, wanted `'Outcome'`; `=4` → got `'Outcome'`, wanted `'Output'`). Independently re-run by the Leader (non-author evidence re-run) — `VERIFIED`, matched exactly.
- **Green (BIL-T-2, attempt 1):** same targeted test → 2 passed. Full spec file: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-result-creator.component.spec"` → 151 passed, 151 total (no regression in the other 149 pre-existing tests). Independently re-run by the Leader — `VERIFIED`, matched exactly.
- Lint (`npx ng lint --quiet`): clean on both tasks.
- No separate `/akili-test` suite or `test-report.md` — the TDD red→green pair embedded in the tasks' own Verification fields is the test evidence (accepted by the user at archive time, see §9).

## 8. Validation Summary

No separate `/akili-validate` pass or `validation-report.md` (accepted by the user at archive time, see §9). Conformance was gated per task by the `/akili-execute` Reviewer loop instead:

- `BIL-T-1` Reviewer verdict: **PASS** (attempt 1) — confirmed the mock signal is genuinely wired to the component under test, both assertions match `BIL-AC-1`/`BIL-AC-2` exactly, diff scoped to the spec file only.
- `BIL-T-2` Reviewer verdict: **PASS** (attempt 1) — confirmed only `case 3`/`case 4` changed, matches `ResultLevelEnum` and every other canonical mapping, Falsifier holds (revert turns `BIL-T-1`'s test red again), Definition of done met.
- No unresolved FAIL findings.

## 9. Accepted Warnings Or Follow-Ups

- **Accepted at archive time (user, 2026-10-13):** no separate `test-report.md`/`validation-report.md` — the embedded TDD evidence and the two Reviewer PASS verdicts in `execution.md` are accepted as sufficient, given the trivial, fully red/green-proven, single-file scope.
- **Reviewer ADVISORY (`BIL-T-2`, non-gating, actioned):** folder-doc `CLAUDE.md` re-stamp — done, in the same commit. `package-lock.json`'s unrelated pre-existing modification excluded from the commit — done.
- **Open follow-up (not blocking, `tasks.md` §7 / `design.md` §13):** extract a shared `RESULT_LEVEL_LABELS`-style constant so `bilateral-result-creator.component.ts` cannot re-diverge from the canonical mapping if a new result level is ever added. Not required for this fix (`design.md` `BIL-DD-1`); file as a separate small spec/kaizen item if the team wants it.
- **Not yet run (out of session reach):** PR, CI, and manual QA on staging/test (`tasks.md` §6 Rollout) — create one Output-level and one Outcome-level bilateral result on staging/test and confirm the breadcrumb label for each.

## 10. Historical Notes

- Root cause confirmed by code investigation (not guessed) at spec time: the inverted mapping affected **every** W3/Bilateral result at level 3 or 4, not only Capacity Sharing for Development (`requirements.md` §11 Out-of-Band Notes) — the fix corrects all of these at once since it swaps the two case values in the single shared `switch`.
- This was a strict TDD pair (`BIL-T-1` red → `BIL-T-2` green) on one file, no parallel branches, exactly as `tasks.md` §4 planned.
- Both tasks landed first-attempt PASS — no rework, no HALT, no Pivot.
- Commit: `3c53f26b7` — `🔧 fix(bilateral-result-creator): correct inverted result-level breadcrumb label (3=Outcome, 4=Output)`.
