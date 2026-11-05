# Kaizen Entry — changes/remove-innovation-team-diversity

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/remove-innovation-team-diversity` |
| Date | 2026-11-05 |
| Branch | qa-development-2026-ss (spec branch) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks | 4 / 4 PASS | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALT / FATAL_FAIL / Pivot | 0 / 0 / 0 | execution.md |
| Disqualified live evidence | 1 (8563 already held a valid q112 answer) | execution.md T-3 |
| Implementer "Not Done / Assumptions" | 1 (snapshot guard bypass; adjudicated as authorized by ITD-DD-4) | execution.md T-2 |
| Advisories | 3 (qa-catalog doc contract) | execution.md T-2 |
| Budget | within (4 tasks, 1 review round each) | design.md §8 |

## Lessons

- **KZ-changes--remove-innovation-team-diversity-1 — The DB verification plan assumed real rows in the needed state existed, and the agent picked a live fixture without first checking its precondition, so one write-and-check round was wasted and the PROD half of the proof was unobservable.** (Product, Medium)
  - Root cause: `tasks.md` ITD-T-3 "Verification" asks for "one 2026 Innovation Dev result complete except team diversity" on test **and** prod, and its "Disqualifies the evidence" clause names the trap. But neither the task nor the Leader pre-checked by SQL that such a row exists or that the chosen result has **no** q112 rows. On PROD, 0 of 204 qualifying results were complete in the other blocks. On TEST, the first pick (8563) already had 113 = Yes, which invalidated the proof after a real write.
  - Evidence: `execution.md` T-3 "PROD checks" (diagnostic 204 / `ok_todo_lo_demas` 0) and "SQL on 11031" (113 = 1, 117 = 1); `tasks.md` ITD-T-3 Verification.
  - Standardization: → P3 (local).

## Noted, not a lesson

- The QA catalog snapshot guard (QAC-R-2) has no sanctioned retire-key path, so an owner-approved removal (ITD-DD-4) needed an ad-hoc script. A first occurrence after release; watch for a recurrence before turning it into tooling (`--allow-removal <key>` in `scripts/qa-catalog-snapshot.ts`).
- After a merge on Windows (`core.autocrlf=true`) the exact-text snapshot spec fails locally on CRLF while the committed blob is LF. It looks like a real failure. Worth one line in the server guide if it bites again.
- A DB function body pasted from DBeaver arrived flattened to one line; its `--` comments make it unusable as a rollback script. Take the rollback from DBeaver's Source tab or a file, never from a chat paste.
- The T-1 lint command (`npx eslint <file>`) cannot run in the client (no `eslint.config.js`); `ng lint --lint-file-patterns` is the working fallback.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/docs/qa-catalog.en.md` (v1.32 changelog row + the additive-only rule near lines 12 and 277) |
| Edit | Add to the v1.32 row: "Owner-authorized exception to the additive-only rule (ITD-DD-4): a field born and retired within the only catalogued year cannot be retired through `valid_to`, so its keys are removed." Add a matching one-line note under "Retirement is by validity, never by deletion." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/docs/qa-catalog.en.md` ~line 68 |
| Edit | Drop the stale parenthetical "(`[]` for `actions`)": no remaining field has an `actions` subfield. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Verification guidance for DB / live-data tasks) |
| Edit | "When a verification needs a live row in a specific state, first give the SQL that proves the row exists **and** meets the precondition (e.g. has no answers for the question under test). If no such row exists in an environment, say so and name the controlled fixture to create instead of 'one real result'." |
| Severity | Medium |
| Status | pending |
