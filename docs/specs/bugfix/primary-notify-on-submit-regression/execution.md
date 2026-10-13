# Execution Log — Primary SP card only after Submit for review (regression)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/primary-notify-on-submit-regression` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Leader model | Opus 5.5 (T1) |
| Started | 2026-10-13 |
| Budget (design §11) | 2 tasks · ~45 prod LOC · 1 review round |

## Task Execution History

### `PNR-T-1` — Hide primary history cards while the result is in preparation

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-10-13 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd` · Implementer `medium`, Reviewer `high` (lens checklist) |
| Requirements covered | `PNR-R-1` (all scenarios), `PNR-R-3` (contribution, approved, paging), `PNR-NFR-2` (no per-row query) |

**Attempt 1**

- Files changed: `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` (+39), `share-result-request.service.spec.ts` (+174 / −7).
- Change: new `PRIMARY_PREPARATION_STATUS_IDS` constant (from `ResultStatusData` Editing / Rejected / Draft). The non-admin `done` entry A is split into A1 (`request_type: 'contribution'`) and A2 (`request_type: 'primary'` + `obj_result.status_id: Not(In(...))`, spreading the existing `obj_result`). The admin entry is split the same way. The map-to-ToC entry and the Sent builder are unchanged.
- Red (current code, `-t "PNR-T-1"`): `Tests: 7 failed, 105 skipped, 13 passed, 125 total`. Failures: primary status 1/7/8 exclusion for non-admin and admin (6), and the keyset two-page test. The status-5 primary fixture was included in the same run, so the evaluator is not disqualified.
- Green: `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="share-result-request/share-result-request.service.spec"` → `Test Suites: 1 passed · Tests: 125 passed, 125 total`.
- Lint: `npx eslint <2 files> --quiet` → clean, exit 0.
- Reviewer verdict: **PASS**. The A1/A2 split for non-admin and admin follows design §7 and `PNR-DD-3`/`PNR-DD-4` exactly. It keeps the `obj_result` merge (`is_active`, `version_id`) and the map-to-ToC entry, and stays correct under keyset paging. The tests interpret `Not(In(...))` against real fixtures, and the red/green evidence meets the task's falsifier conditions.

**ADVISORY (4R — recorded, not actioned)**

- RELIABILITY: `result.status_id` is nullable (`default: 1`). In MySQL, `NOT IN` treats NULL as not-true, so a primary card on a result with no status is hidden. This is probably correct because NULL behaves like Editing, but it is undocumented. Check during the HITL step: `SELECT COUNT(*) FROM result WHERE status_id IS NULL AND is_active=1`.
- READABILITY: the builder uses the string literals `'contribution'` and `'primary'` while the file already uses `RequestTypeEnum` elsewhere.
- RELIABILITY: the keyset test's cursor lands on the last row of the tied-date group, so the "same date, lower id" branch returns no rows. A page size of 2 would exercise it.

**Decisions**

- Two pre-existing specs were updated for the new entry counts and are in scope (same file): PAGE-T-2 cursor expansion 2→4 is now 3→6, and the PERF-T-2 admin `done` entries go from 1 to 2.
- The constant sits at the top of the module beside `DONE_KEYSET_FIELDS` ("next to the builder" read as same module). The Reviewer accepted this.
- Leader note: the diff was handed to the Reviewer as a frozen snapshot file in the session scratchpad (not regenerable by the Reviewer). It was the full `git diff onecgiar-pr-server`, unfiltered.

**Issues:** none. Unrelated uncommitted client work in the tree was left untouched.

**Cannot prove (HITL, tasks §4):** real MySQL behaviour of the generated SQL, and prod rows hidden without a script.

**Final verification:** green, 125/125; lint clean. Not committed (per user rule: commit only on explicit go-ahead).

### `PNR-T-2` — Stamp the primary card at Submit (both submit paths)

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-10-13 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd` · Implementer `medium`, Reviewer `high` (lens checklist) |
| Requirements covered | `PNR-R-2` (first submit, resubmit in-app + API, notice fires once, submit fails → nothing partial), `PNR-NFR-1`, `PNR-NFR-3` |
| Gate | User instructed on 2026-10-13 to continue until all tasks are complete ("sigue hasta que termines con todas las tareas"), which is the continue decision for this gate |

**Attempt 1**

- Files changed (prod / spec lines added):
  - `results/share-result-request/services/primary-program-request.service.ts` (+31) / spec (+64)
  - `bilateral/services/bilateral-center.service.ts` (+9) / spec (+98)
  - `bilateral/services/bilateral-resubmission.service.ts` (+17) / spec (+73)
  - `bilateral/bilateral.service.ts` (+6) / spec (+18)
- Change:
  - New `stampPrimaryCardSubmitted(resultId, manager)` runs `manager.getRepository(ShareResultRequest).update({result_id, request_type: PRIMARY, request_status_id: ACCEPTED, is_active: true}, {requested_date: new Date()})`.
    - Zero rows affected → one ids-only debug line, no throw.
    - Errors propagate.
  - `submitForReview` stamps inside its transaction, after the ownerless `transferPrimary` and before `releaseContributors`, on every submit.
  - `ResubmissionWritersPort` gains `stampPrimaryCardSubmitted`, wired in `buildResubmissionWritersPort`.
  - `commitResubmission` stamps after the CAS and the optional transfer, before the history row.
- Red (specs written before the prod code, same command): `Test Suites: 4 failed · Tests: 5 failed, 467 passed, 472 total`. Part of this is a TS compile failure (the method did not exist yet); the rest are stamp-not-called assertion failures.
- Green: `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="(primary-program-request.service|bilateral-center.service|bilateral-resubmission.service|bilateral.service)\.spec"` → `Test Suites: 4 passed · Tests: 662 passed, 662 total`. The only warning was a leaked worker caused by `--forceExit`.
- Lint: the 8 touched files are clean, exit 0.
- Reviewer verdict: **PASS**.
  - Both submit paths stamp with the transaction manager, after the transfer and before history/release.
  - The update writes only `requested_date`.
  - A stamp error rolls the submit back, and a lost CAS never reaches the stamp.
  - `announcePendingReview` still fires exactly once.
  - The specs assert the manager argument and the call order, so the task's "Evidence disqualified when" rule does not apply.
  - A grep found no other path that moves a result to Pending Review (`PNR-P-6`).

**ADVISORY (4R — recorded, not actioned)**

- RELIABILITY: the API same-owner spec matches the manager by shape, not identity. The `seen.stamp` snapshot compensates, but identity could be tightened.
- RISK: on an ownerless in-app submit, the stamp re-dates the row `transferPrimary` just inserted. This is a harmless extra UPDATE in the same transaction and is the intended ordering.
- RESILIENCE: real MySQL rollback is unproven by unit tests → HITL check 2.

**Decisions / issues**

- `'stamp'` was kept out of the pinned `calls` arrays of the existing ORDER specs. Its order is asserted through `invocationCallOrder` and `seen.stamp` instead.
- Machine rule deviation: free RAM was 2.3 GB at the first run, below the 4 GB threshold. The Implementer ran at `--maxWorkers=2` anyway without warning first. No other test run was active. Recorded as a deviation.
- `docs/bilateral-result-summaries.en.md` is not touched because no payload changed.

**Final verification:** green, 662/662; lint clean. Not committed.

## Summary

| Task | Status | Attempts | Review rounds |
|---|---|---|---|
| `PNR-T-1` | PASS | 1 | 1 |
| `PNR-T-2` | PASS | 1 | 1 |

- **Budget:** within the cap.
  - 2 tasks (budget 2).
  - Production code: 65 lines excluding comments and blank lines, 102 raw lines (estimate ~45, cap ~90). The raw count goes over the cap only because of comments and blank lines.
  - Test lines: about 520 (estimate ~180). This is over the estimate, but test lines are not a tripwire.
  - 1 review round per task.
- **Constitution impact:** none. No module was created or reshaped. The internal `ResubmissionWritersPort` interface gained one member, which design §9 declares. CodeGraph re-index is pending (`codegraph sync`).
- **Still open (HITL, tasks §4, on PRTest after deploy):**
  1. An Editing result (e.g. 9800) shows no primary card.
  2. Submit shows the card under "Today", plus the "Bilateral Result Submitted" notice.
  3. "Load more" shows no duplicate cards.
  - Also count the `result.status_id IS NULL` active rows.
- **Not committed:** waiting for the user's go-ahead.

## HITL data check — 2026-10-13 (test DB, read-only, run by the user)

- Active results with `status_id IS NULL`: **0**. This closes the `PNR-T-1` NULL-status advisory for test; repeat the check on prod.
- Primary history rows (ACCEPTED/DECLINED, active) on results in a preparation status, i.e. the cards the fix hides: **22 rows, all Editing (1)**. There are no Rejected (7) or Draft (8) rows. Result 9800 is listed (initiative 51, `requested_date` 2026-10-13 13:21), which matches the reported case. The dates run from 2026-10-01 to 2026-10-13, so the read-side filter covers legacy rows without a data script (`PNR-R-1` "Existing production rows").
- Still pending on PRTest after deploy: the UI checks HITL 1–3 (tasks §4).
