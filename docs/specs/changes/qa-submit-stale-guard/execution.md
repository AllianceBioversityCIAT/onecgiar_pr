# Execution Log — `changes/qa-submit-stale-guard`

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/qa-submit-stale-guard` (Lite, `gated`) |
| Branch | `fix/qa-submit-stale-guard` from `performance-refactor` @ `9be3db51e` |
| Leader | Claude Opus 5.5 (T1) · Implementer `sonnet` (T2) · Reviewer `opus` (T3) |
| Budget | 2 tasks · ~150 LOC · 1 review round per task |
| Parallelism | `QSG-T-1` and `QSG-T-2` run concurrently. Their files are disjoint (the service vs. the dialog + creator binding). Each Implementer scopes its jest run to its own suites, and the Leader runs the combined suite after both land |

## Task Execution History

### `QSG-T-1` — Re-read the latest assessment on reopen and after a rejected Submit

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-29 |
| Skills | `angular-developer`, `tdd` (the task's own) |
| Requirements | `QSG-R-1`, `-2`, `-3`, `-4` |

- **Files:** `bilateral-quality-assessment-ui.service.ts` (+58/−22 combined with the spec) and `.service.spec.ts` (+134).
- **Changes:**
  - `state` gains `'refreshing'`. It counts in `isBusy()` but not in `isDialogOpen()`.
  - `openStored()` re-reads the latest row by `held.result_id` and then opens. On a read error or `latest: null`, it keeps a copy of the held row with `is_current: false`.
  - On the Submit error path, a `catchError` re-reads the latest row, replaces the assessment, sets `deciding` and rethrows the original error. The state stays `submitting` during the re-read, so `finalize` cannot fire early.
- **Pre-change red:** 8 failed.
  - `Expected: "refreshing" Received: "deciding"`
  - `Expected one matching request … /quality-assessment/42/latest, found none`
  - `Expected: "submitting" Received: "deciding"`
- **Mutations:** each was reverted after its red, and the suite went green again.
  - (a) Skip the re-read in `openStored`: red, `Expected "refreshing" Received "deciding"`, plus 4 cases.
  - (b) Skip the re-read on the Submit error path: red, `Expected "submitting" Received "deciding"`, plus 2 cases.
  - (c) `catchError(() => of(held))`: the fail-closed case goes red, `Expected false Received true`.
- **Implementer verification:** 26/26 on the service spec · 160/160 combined · tsc clean · lint pass.
- **Evidence re-run (Leader-inline, after both parallel tasks landed):** **VERIFIED**. `(bilateral-quality-assessment|bilateral-result-creator)` 3 suites, 160/160 · app tsc 0 errors · lint exit 0.
- **Reviewer (opus): PASS.**
  - A second click during `refreshing` returns early.
  - The error still reaches the subscriber, so the toast still shows, and the state ends in `deciding` with the refreshed row.
  - Fail-closed never mutates the held row.
  - The falsifiers use the same id.
  - The Reviewer ruled the request-level red acceptable: the missing request *is* the defect, and mutation (c) went red on the `is_current` assertion itself.
  - Catching every error, including 5xx, is broader than `DD-2`'s "any 4xx" and fails closed, so it complies.
- **ADVISORY (recorded only):**
  - **Reliability:** no re-read is cancelled by `reset()` or `loadLatest()`. A late response after the user switches results would write the old result's row into this root-scoped service. Guard on `result_id`, or cancel in `reset()`.
  - **Reliability:** if the caller unsubscribes during the Submit re-read, the state ends in `deciding` on the stale row.
  - **Test gap:** no case pins that the original held row stays unmutated.
  - **Test gap:** no direct test of a double `openStored()`.
- **Runtime events:** none.

### `QSG-T-2` — A submitted result opens the drawer read-only

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-09-29 |
| Skills | `angular-developer` |
| Requirements | `QSG-R-5` |

- **Files:** dialog `ts` (+6), `html` (7), `spec.ts` (+39) · creator `html` (+1), `spec.ts` (+30) · `pages/bilateral-result-creator/CLAUDE.md` (8).
- **Changes:**
  - The dialog gains `readOnly = input(false)`.
  - The stale line becomes `@if (stale() && !readOnly())`.
  - The footer becomes `@if (!running() && !readOnly())`.
  - The creator binds `[readOnly]="isFormReadOnly()"`.
  - The folder guide was updated and `Verified:` re-stamped.
- **Pre-change red:** 2 failed.
  - "renders no footer action buttons when read-only": `Expected: false, Received: true`
  - "renders no stale line when read-only": received `<p class="bqa-dialog__stale">`
- **Mutation:** dropping `!readOnly()` from the footer gate makes the read-only case go red, because "Make adjustments" is present. The mutation was reverted.
- **Implementer `Not Done / Assumptions` (verbatim):**
  > `pages/bilateral-result-creator/CLAUDE.md` is now 145 lines, over the 120-line cap in `docs/COMPONENT-DOCS.md` — but it was already 139 lines before this task (pre-existing debt from earlier features), and restructuring it was out of this task's scope.

  Leader ruling: this is not scope owed. The cap was already broken before the task, and restructuring the guide is not in `QSG-T-2`. It is recorded as debt.
- **Implementer verification:** 154/154 (before T-1 landed) · tsc clean · lint pass.
- **Evidence re-run (Leader-inline):** **VERIFIED**. Combined 160/160, app tsc 0, lint exit 0.
- **Reviewer (opus): PASS.**
  - Both gates are updated, and ✕ / Escape / scrim sit outside the `@if`.
  - `isFormReadOnly` returns true for Pending Review and for any non-Editing/Draft status.
  - The tests assert the rendered DOM.
  - The creator binding test uses `By.directive` on the real child and flips both ways, which is valid under the DoD.
  - The pinned footer tests are intact.
  - There is no copy change.
- **ADVISORY (recorded only):**
  - **Readability:** the new `CLAUDE.md` paragraph could be 2 lines. The history belongs in Jira.
  - **Readability:** the `Verified:` line does not follow the `COMPONENT-DOCS.md §5` form. The file keeps its own format.
  - **Risk:** the guide needs a dedicated cleanup under `§4`.
  - **Reliability:** while the status is still `null`, the rule treats it as editable, so the footer can show briefly. This is the existing P2-3152 rule, and the server still refuses the submit.
- **Runtime events:** none.

## Summary

- **Result:** both tasks passed on attempt 1, with 1 Reviewer round each. That is within the budget of 2 tasks and 1 round per task.
- **Size (budget tripwire):** ~283 lines (257 insertions, 26 deletions) against a budget of ~150, most of it tests. Production code is ~70 lines. Reported to the user at the continue gate.
- **Still open:** `P-5` (a non-deterministic `content_hash`), to be settled by the user's DB check.
