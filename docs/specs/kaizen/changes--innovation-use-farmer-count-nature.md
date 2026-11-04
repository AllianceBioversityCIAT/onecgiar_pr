# Kaizen Entry — changes/innovation-use-farmer-count-nature

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-farmer-count-nature` (P2-4048) |
| Date | 2026-11-03 |
| Branch | qa-development-2026-ss (spec branch, no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 (T-1..T-7) | tasks.md |
| Reviewer FAIL rework attempts | 2: T-5 attempt 1 (checks.sql column, id drift, TBD predicate, body-only BEGIN/END); T-6 attempt 1 (rewritten change-log row, no fifth-code guard) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 (1 disqualifier stop on T-3, resolved by an execute-time amendment) | execution.md T-3 |
| Findings after code PASS | 2 PRTest findings (Households deselect; How many not required before save), fixed in db09d3767 | execution.md T-7 fixes |
| PRODUCT_BUGs / Validation | n/a (no test-report or validation-report; accepted by Santiago) | archive-summary.md |
| Drift report | none (`docs/specs/audits/` holds only README) | — |

## Lessons

- **KZ-changes--innovation-use-farmer-count-nature-1 — A task's "Consumers" line named one caller from memory. The service had four, so the disqualifier fired mid-execute.** (Product, Medium)
  - Root cause: tasks.md IFC-T-3 said "`saveInnovationUse` callers: the v2 controller only (verify with codegraph_callers)". The claim was written at specify time without running the lookup. `saveAnticipatedInnoUser` is also called by the bilateral handler, `innovation_dev.service.ts` and the review update in `results.service.ts`. The result was a stop, a user decision (bilateral guard) and a scope amendment.
  - Evidence: execution.md — "IFC-T-3 … stopped at disqualifier", "user decision", and the T-3 Reviewer ADVISORY on 4 callers.
  - Standardization: → P1

## Noted, not a lesson

- Verification SQL that picks sample ids by their current state drifts between the BEFORE and AFTER runs. `checks.sql` needed a Step 2b that re-evaluates the pasted BEFORE ids (T-5 attempt 1). One instance; if it recurs, add it to the SQL-HITL checklist.
- A global search-and-replace of a version string rewrote a historical change-log row (T-6 attempt 1). Change logs are append-only, so edit them by exact row.
- The forward pointer from the T-2 review ("the client must always send both fields") was carried into the T-4 brief and prevented a data-loss bug. The pattern worked as designed.
- Jest's unsaved-row `[required]` convention (`!!result_actors_id`, since 7a5519f7b) hid a requirement ("total required") that jsdom specs could not see. It was found in PRTest.
- Two sessions shared one checkout. Branch switches for the perf merge carried the other session's unstaged edits; they survived, but each switch needed an explicit check.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` |
| Edit | A task's `Consumers:` line must quote the output of `codegraph_callers` (or grep) for the symbol, run at specify time, not a remembered list. "verify with …" is not a substitute for running it. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` (data model, `result_actors`) |
| Edit | `result_actors` gains `count_unit` (`households`\|`individuals`) and `use_nature` (`information_received`\|`innovation_applied`), varchar(32) NULL, Farmers rows of 2026+ W1/W2 Innovation Use only (P2-4048, migration 1793300000000). |
| Severity | Low |
| Status | pending |
