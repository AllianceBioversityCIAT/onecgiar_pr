# Tasks — Primary SP card only after Submit for review (regression)

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec Path | `bugfix/primary-notify-on-submit-regression` |
| Linked spec | `requirements.md` + `design.md` (this folder) |
| Depth | Lite · Bug Mode |
| Approval Mode | gated |
| Status | complete · tested (HITL passed 2026-10-13) |
| Budget (design §11) | 2 tasks · ~45 prod LOC + ~180 test LOC · 1 review round — escalate above 3 tasks / ~90 prod LOC / 2 rounds |

## 2. Pre-flight checklist

- [ ] Branch is not `master`; no other AKILI session on `share-result-request.service.ts` / `bilateral-center.service.ts` in this checkout (`Parallel-safe: no`).
- [ ] Test runs follow the machine rules: Jest **always** `--maxWorkers=2`, **always** `--testPathPattern` scoped to the files below, one test run at a time, never the full suite.
- [ ] Lint only touched files: `npx eslint <files> --quiet`.

## 3. Tasks

### `PNR-T-1` — Hide primary history cards while the result is in preparation (regression test first)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | none |
| Requirements | `PNR-R-1` (all scenarios), `PNR-R-3` (contribution + approved scenarios) |
| Design | §7 Inbox, `PNR-DD-1`, `PNR-DD-3`, `PNR-DD-4`, premises `PNR-P-2`, `PNR-P-3`, `PNR-P-7` |
| Skills | `nestjs-expert`, `tdd` |
| Files | `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` + `share-result-request.service.spec.ts` |

**Scope**
1. **Red first:** add specs on `buildWhereReceivedConditions(...).done` (non-admin and role 1) asserting that no `done` entry can match a `primary` row unless `obj_result.status_id` excludes 1, 7 and 8; run → must FAIL on current code.
2. Split the non-admin first `done` entry into contribution / primary entries and the admin entry likewise (design §7); the preparation set is a named constant from `ResultStatusData`. Keep `obj_result` merging (`is_active`, `version_id`). The map-to-ToC entry is unchanged.
3. Add an in-memory evaluation test (same style as the existing visibility tests that evaluate the builder output against fixtures) proving the outcome rows:

| Fixture row | Expected in `done` |
|---|---|
| primary, ACCEPTED, result status 1 (the reported 9800 case) | **excluded** |
| primary, ACCEPTED, status 7 · status 8 | excluded |
| primary, ACCEPTED, status 5 · 6 · 3 | included |
| contribution, ACCEPTED/DECLINED, status 1 | included |
| map-to-ToC row, status 1 | included |
| same set through `applyKeysetCursor` with a cursor | same inclusion; no duplicate ids across two pages |

**Scenario / clause ownership:** `PNR-R-1` "Center creates a result" (row 1), "changes SP while Editing" (row 1 for both SP ids), "Correction after rejection" (status 7), "AI Draft" (status 8), "Existing production rows" (read-side only — no data script is part of this task); "BUT must NOT remove owner/ToC" (no write in this task: diff touches no write path); "AND IT MUST behave the same for admin" (role 1 case). `PNR-R-3` contribution + approved scenarios and "paging … no duplicated and no skipped" (cursor row).

**Verification**
```
cd onecgiar-pr-server
npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="share-result-request/share-result-request.service.spec"
npx eslint src/api/results/share-result-request/share-result-request.service.ts src/api/results/share-result-request/share-result-request.service.spec.ts --quiet
```

**Done when** step-1 specs were observed red before the change and the whole file is green after; lint clean.

**Input that must make it fail:** the current builder (no status condition) with the status-1 primary fixture → the "excluded" assertion fails. If the new specs pass *before* the code change, they are not evidence — fix the test.

**Evidence disqualified when** the in-memory evaluator does not interpret `Not(In(...))` / nested `obj_result` (it would include or exclude everything): confirm by the status-5 primary fixture being **included** in the same run. **Cannot prove:** real MySQL behaviour of the generated SQL — covered by the HITL check below.

---

### `PNR-T-2` — Stamp the primary card at Submit (both submit paths)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | none (independent of T-1; run after it to keep one test run at a time) |
| Requirements | `PNR-R-2` (all scenarios), `PNR-NFR-1`, `PNR-NFR-3` |
| Design | §7 Stamp at submit, `PNR-DD-2`, §9, premise `PNR-P-6` |
| Skills | `nestjs-expert`, `tdd` |
| Files | `primary-program-request.service.ts` (+ spec), `bilateral-center.service.ts` (+ spec), `bilateral-resubmission.service.ts` (+ spec), `bilateral.service.ts` writers wiring (~line 4811) |

**Scope**
1. **Red first:** specs that (a) `submitForReview` calls the stamp with the **transaction manager** for an owned result and for an ownerless one *after* `transferPrimary`; (b) `commitResubmission` calls the port's stamp inside its transaction after the CAS; run → must FAIL.
2. `PrimaryProgramRequestService.stampPrimaryCardSubmitted(resultId, manager)`: update the active ACCEPTED `primary` row's `requested_date` to now; 0 rows → ids-only debug log, no throw; query error propagates. Unit specs for: 1 row updated (where clause scoped to result, `primary`, ACCEPTED, active; only `requested_date` in the set), 0 rows (no throw), error (rejects).
3. Wire: `submitForReview` (inside the tx), `ResubmissionWritersPort` new member + `bilateral.service.ts` port wiring, `commitResubmission` (inside the tx). Update existing test doubles of the port.

**Scenario / clause ownership:** `PNR-R-2` "First submit" (owned-result spec), "Resubmit after rejection" (in-app `isResubmission` spec + API `commitResubmission` spec), "AND Bilateral Result Submitted still fires once" (assert `announcePendingReview` called exactly once, unchanged), "Submit fails … nothing partial" (`PNR-NFR-1`: stamp error → transaction callback rejects; and a lost CAS → stamp never called). `PNR-NFR-3`: log line contains only ids.

**Verification**
```
cd onecgiar-pr-server
npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="(primary-program-request.service|bilateral-center.service|bilateral-resubmission.service|bilateral.service)\.spec"
npx eslint <the 8 touched files> --quiet
```

**Done when** step-1 specs observed red, all four spec files green, lint clean.

**Input that must make it fail:** a `submitForReview` that stamps with the injected repository instead of the tx `manager` → the "called with manager" assertion fails; a stamp placed before the ownerless `transferPrimary` → the order assertion fails (transfer retires the row it stamped).

**Evidence disqualified when** the stamp is asserted only as "called" without the manager argument or call order — that is a presence check; it cannot prove atomicity. **Cannot prove:** real transaction rollback on MySQL — covered by HITL.

## 4. HITL checks (no automated gate — requirements §7)

Run on PRTest after deploy (local stack writes to shared prdb — do not click write buttons there):

1. As an SP member, open Received: a known Editing bilateral result created after 2026-10-07 (e.g. 9800) shows **no** primary card.
2. Submit a test result as its Center → the SP sees the primary card under "Today" plus the "Bilateral Result Submitted" notice.
3. Scroll / load more in "All": no duplicated cards across pages.

## 5. Coverage closure

| Requirement clause | Owner |
|---|---|
| `PNR-R-1` all 5 scenarios, BUT, AND IT MUST | `PNR-T-1` |
| `PNR-R-2` 3 scenarios + AND (notice once) | `PNR-T-2` |
| `PNR-R-3` contribution / approved / paging | `PNR-T-1` (+ HITL 3) |
| `PNR-NFR-1` atomicity | `PNR-T-2` (+ HITL 2) |
| `PNR-NFR-2` performance | `PNR-T-1` adds no per-row query (review check); no automated timing gate — accepted risk |
| `PNR-NFR-3` ids-only logs | `PNR-T-2` |
| Prod rows hidden without script | HITL 1 (no automated check) |

## 6. Dependency graph

`PNR-T-1` ∥ `PNR-T-2` (no code dependency; execute sequentially to respect the single test-run rule). Single PR.
