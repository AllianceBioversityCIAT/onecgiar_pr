# Execution Log — P2-3960 · Bilateral save alerts tell one consistent truth

## Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3960-bilateral-save-alert-consistency` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` · baseline `fcd441ad1` |
| Leader | Claude Code `opus` (T1) |
| Implementer / Reviewer wrappers | `.claude/agents/akili-implementer.md` (`sonnet`, T2) / `akili-reviewer.md` (`opus`, T3) |
| Persona drift at start | `akili doctor --agents`: `leader.md` → `primary-instructions` OUTDATED (matched 2.36.0); implementer/reviewer CURRENT; tester `context-alignment` CUSTOM-EDITED. Not fixed in-run (`.agents/` is shared-file territory); reported to the user |
| Unattributed tree changes at start | `docs/specs/bugfix/reporting-memory-runners/*`, `onecgiar-pr-client/.../portfolio-overview.copy.ts`, `typology-block.component.spec.ts`, `onecgiar-pr-server/src/clarisa/clarisa-projects/*`, `docs/specs/changes/portfolio-overview-charts-clarity/`. These are not this spec's changes and are never restored by it |

## Task Execution History

### T-1 · Editor: scope navigation failure and the Save draft branch to what was sent

- **Status:** `[~]` blocked, waiting on the user's decision (spec-mandated stop at scope step 1, P-9)
- **Date:** 2026-11-23
- **Attempts:** 1 (stopped before any code; no rework attempt consumed. This is a blocker, not a FAIL)
- **Attempt 1**
  - files changed: none
  - verification: not run (stopped before step 2)
  - Reviewer: not spawned (no diff)
  - runtime events: none
- **spawns:** implementer 19 calls, ~145k tokens, ended `partial` (blocker named)
- **Skills:** angular-developer, tdd, systematic-debugging (task defaults, no deviation). Effort: medium
- **Not Done / Assumptions (verbatim from the Implementer):**
  > STATUS: STOPPED at scope step 1 (P-9). The answer is that a save `'error'` does NOT paint a failed state on the field cards. You told me to stop and report in that case, so I made no code, spec, or CLAUDE.md changes.
  > Not run (all pending your decision): the scoped `selectSection()` and `triggerManualSave()` changes; tests A, B and C and the three consumer adaptations; falsifier runs A, B and C; the `string`-for-`readonly string[]` build falsifier; Jest, lint and build runs; the `CLAUDE.md` update.
  > Assumption: I read "stop and report" as applying to this finding even though the stated task scope is client-only with no visual change.
- **P-9 settled: FALSE (visibility gap confirmed)**
  - `titleStatus` / `descriptionStatus` / `leadContactStatus` are defined at `section-general-info.component.ts:536-538` and are read only by `section-general-info.component.spec.ts:741-747`. No template binds them. The Leader re-checked this inline with a grep over `onecgiar-pr-client/src`.
  - The field card's red state (`field-card.component.ts:141` `showsError`, `field-card.component.html:18` `fc-error`) is fed only by word-count validation, for example `pr-input.component.html:12`.
  - Consequence: today a stale save `'error'` on title, description or lead contact has no per-field signal. The section-wide navigation block is the only signal. DD-1 removes that block when nothing was dispatched, so after DD-1 the user would see no signal at all. design.md §10's answer ("the failure is still visible on the field itself") rests on P-9 and does not hold. P-9's "If false" impact, graded Low in the ledger, turns out higher.
- **Requirements covered:** none yet
- **Decisions made:**
  - The scope decision belongs to the user (Pivot evidence: the design.md §10 premise is false).
  - **User decision, 2026-11-23 (AskUserQuestion):** "Accept gap, proceed". Run T-1 as written; record the gap as a known trade-off under BSF-OQ-1; follow-up ticket for per-field error display (outside this spec).
  - Execute-time spec edits that do not change any requirement's meaning: `design.md` §10 (answer amended: the field does not show the failure, and the gap is accepted) and §11 P-9 row (settled false). Both are carried into T-1's Reviewer brief as named conformance checks.
  - Resumed the same Implementer by message (its context survived; no code had been written).
- **Attempt 1 (resumed after the decision)**
  - files changed: `bilateral-result-creator.component.ts`, `bilateral-result-creator.component.spec.ts`, `bilateral-result-creator/CLAUDE.md`
  - Implementer verification:
    - jest 182/182;
    - lint clean;
    - build exit 0;
    - falsifiers executed after the change. A (DD-1 revert) gave `Expected: "contributors"` / `Received: "general-info"`. C (DD-3 revert) gave `Expected: ObjectContaining {"title": "Nothing to save yet"}` / `Received: {... "title": "Draft saved" ...}`. B (mutation `waitForSectionSave(current)`) gave `Expected: "general-info"` / `Received: "contributors"`. The build falsifier (`"title"` as the second argument) gave TS2345, exit 1.
  - Implementer deviations:
    1. The wait in `selectSection()` is skipped when `flushTargets` is empty, which avoids a 15 s stall on a stale error.
    2. An extra consumer test was adapted: "the flush fails: savedTick NOT bumped" (~:2042), which P-6 did not list.
    3. `CLAUDE.md` is now 127 lines.
  - Evidence re-run (Leader inline): jest 182/182, lint clean → **VERIFIED**. Build re-run is in the background.
  - Reviewer: **FAIL**. Verbatim issue:
    > 1. **Discovered Issue:** `bilateral-result-creator/CLAUDE.md` is now 127 lines. The diff adds 5 net lines to a file that was already about 122, so it makes an existing overrun worse instead of holding or reducing it.
    > * **Violated Rule:** `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4: "Hard cap **120 lines**. Over it means one of three things: (1) … cut per §3; (2) … push a section down …; (3) it is history, not context → move the narrative to the Jira `Technical documentation` subtask". The same rule is quoted in the package CLAUDE.md §10 *Folder docs*.
    > * **Remediation Suggestion:** Bring the file to 120 lines or fewer and keep the P2-3960 facts. Shorten the new invariant text. "`selectSection()` and `triggerManualSave()` both scope wait, failure check and copy to `flushTargets` (P2-3960); an empty set neither waits nor blocks. Trade-off BSF-OQ-1: a stale field error has no per-field signal." fits in about 3 lines. Apply §4(3) to history-style bullets, for example the narrative of the second rework of the BSP-T-1 savedTick guard. Do not touch code or tests.
  - Reviewer verdicts on the deviations:
    1. The guard conforms. It is a refinement of DD-1 and changes no outcome; it only removes a 15 s stall that would also trip the T-1 Disqualifier.
    2. The extra test is acceptable. P-6 under-counted, which is a kaizen note.
    3. The line count is the FAIL above.
  - ADVISORY (4R):
    - RELIABILITY: DD-2 scopes only the error exit; the wait loop's `hasPendingFor(section)` is still section-wide. Case: stale error on field A plus a successful edit of field B, then a rail click. The UI stalls 15 s and then navigates. This meets BSA-R-1 and is the same behaviour Save draft has had since BSF-T-2. Untested. Suggested follow-up ticket: scope the pending condition. Not in this spec.
    - READABILITY: test B leaves a 300 ms `setTimeout` mutating a shared mock after the test ends.
  - runtime events: none
- **Attempt 2** (rework, effort bumped medium → high; docs-only)
  - files changed: `bilateral-result-creator/CLAUDE.md` only. It went from 127 to 119 lines, both cuts under COMPONENT-DOCS §4(1): the invariant from 11 to 6 lines, and the BSP-T-1 history from 9 to 5 lines.
  - Implementer verification: `wc -l` = 119; jest 182/182.
  - Evidence re-run (Leader inline): `wc -l` = 119; the code diff is byte-identical to attempt 1; jest 182/182 → **VERIFIED**. The attempt 1 build re-run finished with exit 0 (`Application bundle generation complete`) on the same code.
  - Reviewer: **PASS**. "The T-1 attempt 2 rework clears the only gating issue from attempt 1. The file is 119 lines, which meets the COMPONENT-DOCS.md §4 hard cap of 120. Only this CLAUDE.md changed, and the code and test diff was already judged conformant in attempt 1. I checked both cuts against the previous text: no fact that is still true was lost."
  - ADVISORY (4R):
    - READABILITY: the wording "both scope wait, failure check and copy" is loose. `selectSection()` has no copy branch, and the empty-set branch can say "Nothing to save yet" or "Up to date". Fix it on the next edit.
    - RELIABILITY: the 15 s stall when a stale error and a successful save happen in the same section, carried over from attempt 1. Follow-up ticket candidate.
  - runtime events: none
- **Final status:** PASS (attempt 2)
- **spawns:**
  - implementer, attempt 1 (first spawn): 19 calls, ~145k tokens, ended partial (blocker).
  - implementer, attempt 1 (resumed): 22 calls in total, ~177k tokens, ended complete.
  - reviewer, attempt 1: 12 calls, ~101k tokens, ended fail.
  - implementer, attempt 2: 6 calls, ~116k tokens, ended complete.
  - reviewer, attempt 2 (resumed): 2 calls, ~107k tokens, ended complete.
- **Requirements covered:** BSA-R-1 (tests A and B, plus the adapted `keeps the section open…`), BSA-R-2 (test C, plus the adapted `:1018`/`:1036`).
- **Decision (refinement of DD-1, Reviewer-endorsed):** `selectSection()` waits only when `flushTargets.length > 0`. With an empty set the wait would stall 15 s and change no outcome.
- **Kaizen note:** P-6 under-counted the consumers. The test "the flush fails: savedTick NOT bumped" was also affected. P-9 was graded Low and turned out to invalidate a §10 premise.
- **Final verification:** jest 182/182 · lint clean · build exit 0.
- **Budget running totals:**
  - tasks: 1 of 2 done;
  - LOC: 86 added and 25 removed over 3 files (budget about 130 in total);
  - review rounds: 2 used against a budget of 2 in total (1 per task). T-1 used both, so T-2's first Reviewer verdict will exceed the budget's review rounds.
- **Issues encountered:** the premise ledger rated P-9 Low; the settling check shows it invalidates the §10 reversion answer
- **Gate (user, 2026-11-23):** "Commit T-1, run T-2". T-1 committed as `6cc9c75e0` (its 3 files and the spec folder only). The user accepted the extra review round for T-2, over the budget of 2.

### T-2 · Alert services: replacement cancels stale timers; removal is null-safe

- **Final status:** PASS (attempt 1)
- **Date:** 2026-11-23
- **Attempts:** 1
- **Attempt 1**
  - files changed: `onecgiar-pr-client/src/app/shared/services/customized-alerts-fe.service.ts`, `customized-alerts-fs.service.ts`, `customized-alerts-fe.service.spec.ts`, `customized-alerts-fs.service.spec.ts` (83 lines added, 2 removed)
  - Red before the fix (tests first, `npx jest src/app/shared/services/customized-alerts --no-coverage`): `3 failed, 28 passed`.
    - D: `Expected: false` / `Received: true`.
    - E and F: `[TypeError: Cannot read properties of null (reading 'removeChild')]`.
  - Falsifier after the fix:
    - Removed `closeTimers.forEach(...)` and both `if (!alert.parentNode) return;` guards.
    - Result: `3 failed, 28 passed`, with the same reds.
    - Restored afterwards.
  - Implementer verification: jest 31/31 (2 suites); lint clean; build exit 0.
  - Evidence re-run (Leader inline): jest 31/31, lint exit 0, build exit 0 → **VERIFIED**.
  - Reviewer: **PASS**. "T-2 passes. I reviewed 148 diff lines (standard depth, all four lenses) against tasks.md T-2, requirements §6 BSA-R-3 and BSA-R-4 plus §7, and design DD-4, DD-5, §9, P-7 and P-8. Every scope item, Disqualifier and Done criterion is met, and nothing contradicts the amended design §10 or the P-9 row." The Reviewer traced each red to a behavioural assertion and confirmed there is no leak of the mocks between describes.
  - ADVISORY (4R):
    - RELIABILITY: if the user closes an alert before its timer fires, the timer stays in the map until the next `show()` or until it fires. When it fires it does nothing, so this is harmless. DD-4 keeps `closeAction` unchanged.
    - READABILITY: the map can only ever hold one entry, because `show()` clears everything. Keying it by id follows DD-4's wording.
  - runtime events: none
- **Not Done / Assumptions (verbatim, assumptions only, so no continuation):**
  > I did not run `codegraph_impact` before editing. The change is additive and internal to `show()`: no signature change and no change to `closeIn` semantics. The `closeTimers.clear()` call runs on every `show()`, including a `show()` with a different id. That matches DD-4's "clears ALL pending timers" and the single-alert behaviour from P2-3030. `dist/` was produced by the build; it is gitignored and absent from `git status`.
- **spawns:**
  - implementer: 17 calls, ~144k tokens, ended complete;
  - reviewer: 11 calls, ~86k tokens, ended complete.
- **Skills:** angular-developer, tdd, error-handling-patterns (the task defaults). Effort: medium.
- **Requirements covered:** BSA-R-3 (test D), BSA-R-4 (tests E and F).
- **Final verification:** jest 31/31 · lint clean · build exit 0.
- **Budget running totals:**
  - tasks: 2 of 2;
  - LOC: 169 added and 27 removed over 7 files, against an estimate of about 130;
  - review rounds: 3 against a budget of 2. The user accepted the overrun at the T-1 gate. The LOC overrun comes mostly from tests and the CLAUDE.md invariant.

## Summary

| Task | Status | Attempts | Reviewer |
|---|---|---|---|
| T-1 | PASS | 2 (docs-only rework, CLAUDE.md line cap) | PASS |
| T-2 | PASS | 1 | PASS |

- **Requirements:** BSA-R-1..4 are all covered by automated tests, and each test was shown to go red under its falsifier.
- **Open for validate (HITL):** the proposal §13 manual repro on prtest.
- **Follow-up ticket candidates (advisories, not in this spec):**
  1. Per-field display of save errors (the accepted P-9/BSF-OQ-1 trade-off).
  2. A 15 s stall on a rail click when the same section holds a stale error and a successful save; the scoped pending condition would fix it.
  3. Loose wording in the T-1 CLAUDE.md invariant.
- **Kaizen inputs:**
  - P-6 under-counted the consumers.
  - P-9 was graded Low but invalidated a §10 premise.
  - The review-round budget assumed no rework.
