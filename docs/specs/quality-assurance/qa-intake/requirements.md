# Requirements — QA intake (`quality-assurance/qa-intake`)

## Document Control

| Field | Value |
|---|---|
| Module / feature | `quality-assurance` / `qa-intake` |
| Depth | **Full**. It is the first external write path into `result`: service-to-service auth, a workflow status transition and a migration |
| Type | Change (from `proposal.md`, option B, 2026-10-29) |
| Deliverable | software |
| Approval Mode | gated |
| Owner | Juan David Delgado |
| Status | approved 2026-10-29 (Juan David) — spec complete, ready for `/akili-execute` |
| Ticket(s) | [P2-4040](https://cgiarmel.atlassian.net/browse/P2-4040) (sub-task of [P2-3905](https://cgiarmel.atlassian.net/browse/P2-3905)) |
| Requirement prefix | `QIN-R-n` (`QRF-` belongs to `qa-results-feed`, `QAC-` to `qa-field-catalog`) |
| Depends on | `quality-assurance/qa-results-feed`, which is executed and deployed. QIN reuses its eligibility rule and route conventions |
| Owner decisions (2026-10-29) | Release happens when QA finishes or reopens a result, and **QA decides whether the result ends QAed (`status_id = 2`)** (proposal OQ-1 and OQ-2, both in scope). Intake does not depend on `pgv_in_qa` (OQ-3). The unsubmit guard applies only to results in an **open** phase (R-3) |
| Baseline | `docs/prd.md` (QA review, status workflow) · `docs/trd/trd.md` (workflow W-status transitions, ADR on headless surfaces) · `onecgiar-pr-server/docs/qa-catalog.en.md` (feed contract) · `docs/ux-ui/design.md`: n/a, no UI |
| Kaizen | `docs/specs/kaizen-log.md` does not exist, so there are no Active Lessons |

## 1. Executive Summary

The QA platform gets two write routes next to the feed:
- `POST /api/qa/results/intake` marks the results QA took as **In QA** (`in_qa = 1`).
- `POST /api/qa/results/release` takes them out of QA, ending each one either **QAed** (`status_id 3 → 2`) or **still Submitted**.

While a result in an open phase is In QA, its program cannot unsubmit it. Every change is recorded with the calling platform and the time. This replaces the Reporting team's manual SQL step and is the first time PRMS writes the QAed status itself.

## 2. Glossary

| Term | Meaning |
|---|---|
| In QA | `result.in_qa = 1`. It drives the "QA in progress" badge (`prdb.get_qa_info`) and the client's "In QA" tag |
| Intake | QA's confirmation that it took a result into its review |
| Release | QA's confirmation that a result leaves its review, with an **outcome** |
| Outcome `qaed` | The result passed QA. It ends with `status_id = 2` (Quality Assessed) and `in_qa = 0` |
| Outcome `not_qaed` | The result leaves QA without being QAed (reopened for adjustments, or not assessed). It keeps `status_id = 3` and ends with `in_qa = 0` |
| Eligible | The feed's rule (`qa-results-feed` QRF-R-3): active, Submitted, phase year in Reporting or IPSR, `source = 'Result'`, catalogued type, active lead program |
| Open phase | The result's phase (`version`) has `status = 1` |
| Calling platform | The CLARISA client that called, as resolved by the key guard |

## 3. System Context & Scope

**Today:**
- `in_qa` is set by a manual UPDATE from the Reporting team. No code, trigger or event writes it (test DB, 2026-10-29: the grep finds reads only; the only trigger on `result` is `result_auto_code`, and the only routine is `get_qa_info`, which reads it).
- Nothing in PRMS writes `status_id = 2`:
  - `ResultQaedService` is empty (`api/result-qaed/result-qaed.service.ts:4`);
  - `result_qaed_log` holds 0 rows in test;
  - 3 345 active results in test are status 2, written outside the application.
- Unsubmit checks role, existence and justification, but neither `in_qa` nor `status_id` (`api/results/submissions/submissions.service.ts:177-233`).

### In scope

- Two routes, intake and release, with the feed's auth and shape conventions.
- The `in_qa` flag, the `status_id 3 → 2` transition and an audit record.
- An unsubmit guard, for both Reporting and IPSR.
- A contract doc update.

### Out of scope

- Any UI change. The tag, badge and AI Review lock already exist.
- The KP badge logic in `get_qa_info`.
- Turning `pgv_in_qa` on.
- Back-filling or cleaning old `in_qa` flags (29 rows from 2024 in test).
- Moving a result from QAed back to Submitted. That is unsubmit's existing job, unchanged.
- Notifications to programs.

## 4. Stakeholders / Personas

| Persona | Interest |
|---|---|
| QA platform (system, via CLARISA key) | Confirms intake, then releases with an outcome |
| QA admin (human, behind the platform) | Their actions become visible in Reporting without asking Reporting |
| Program submitter | Sees "In QA". Cannot pull the result back while it is in QA in an open phase |
| Reporting team | Stops running the manual UPDATE |
| PMU / downstream (versioning, ToC KPI coverage, replication) | Read `status_id = 2` as before |

## 5. Functional Requirements

### Requirement QIN-R-1: Service authentication

Both routes SHALL require a valid CLARISA key in `x-api-key` with a permission for that exact route string.

#### Scenario: No or wrong key

- GIVEN a call to intake or release
- WHEN the key is missing, invalid, or lacks that route's permission
- THEN the response is 401
- BUT it must NOT change any row, and must NOT reveal which ids exist
- AND IT MUST NOT accept the PRMS `auth` JWT as a substitute

- The routes are excluded from the JWT middleware, are not throttled (same prefix as the feed), and return no response envelope.
- The key is never logged or echoed.

### Requirement QIN-R-2: Request validation

The routes SHALL validate the body before touching data.

- `phase_year` is required, an integer in 2000–2100. There is no default.
- **Intake:** `result_ids` holds 1–50 positive integers. Duplicates are collapsed, keeping the order of first appearance.
- **Release:** `items` holds 1–50 entries of `{ result_id, outcome }`, with `outcome ∈ {qaed, not_qaed}`.
  - The same `result_id` twice → 400.
  - Unknown properties → 400.
- An invalid body → 400 naming the offending field.
- A `phase_year` with no QA catalog → 404, the same rule as the feed.

#### Scenario: Release with an unknown outcome

- GIVEN `items: [{ result_id: 10, outcome: "approved" }]`
- WHEN release is called
- THEN 400 names `outcome`
- AND IT MUST write nothing

### Requirement QIN-R-3: Intake marks eligible results In QA

For each requested id, intake SHALL set `in_qa = 1` when the result is eligible for the requested `phase_year` (QRF-R-3, the same reasons and order as the feed's `not_eligible`). Otherwise it reports the id as not taken, with that reason.

#### Scenario: Mixed batch

- GIVEN ids A (eligible, `in_qa = 0`), B (eligible, `in_qa = 1`), C (Editing) and D (unknown)
- WHEN intake is called for their phase year
- THEN A is reported as taken and changed, and its `in_qa` is now 1
- AND B is reported as taken and unchanged
- AND C is reported not taken with `not_submitted`, and D with `not_found`
- BUT C and D must NOT change in any column
- AND IT MUST NOT write an audit row for B, because nothing changed

- Intake does not depend on `pgv_in_qa` (owner decision, OQ-3).
- Repeating the same call changes nothing further (idempotent).

### Requirement QIN-R-4: Release ends QA with an outcome

For each item, release SHALL apply to a result that is In QA (`in_qa = 1`), still Submitted (`status_id = 3`), and in the requested phase year.

- Outcome `qaed` → `status_id = 2` and `in_qa = 0`.
- Outcome `not_qaed` → `in_qa = 0`; `status_id` stays 3.
- Any other state → the item is reported not released, with a reason:
  - `not_found`: unknown or inactive;
  - `other_phase`;
  - `not_in_qa`: `in_qa = 0`;
  - `not_submitted`: In QA but no longer Submitted, for example already QAed.

#### Scenario: QA passes a result

- GIVEN result A, In QA and Submitted, in phase year 2026
- WHEN release is called with `{ result_id: A, outcome: "qaed" }` for 2026
- THEN A is reported released with outcome `qaed`
- AND its `status_id` is 2 and `in_qa` is 0
- AND an audit row records the outcome, the platform and the time

#### Scenario: QA reopens a result for adjustments

- GIVEN result A, In QA and Submitted
- WHEN release is called with outcome `not_qaed`
- THEN `in_qa` is 0 and `status_id` stays 3
- AND the program can then unsubmit it (QIN-R-6)

#### Scenario: Release of a result that was never taken

- GIVEN result A, Submitted with `in_qa = 0`
- WHEN release is called with outcome `qaed`
- THEN A is reported not released with `not_in_qa`
- BUT its `status_id` must NOT change. A result reaches QAed only through intake.

### Requirement QIN-R-5: Every change is recorded

Every row change made by intake or release SHALL produce exactly one audit record in the same atomic unit as the change. The record holds:
- the result;
- the action: `intake`, `release_qaed` or `release_not_qaed`;
- the phase year;
- the calling platform;
- the time.

- A call that changes nothing records nothing.
- If the audit record cannot be written, the change is not applied.
- The record holds no key, token or person data.

### Requirement QIN-R-6: Unsubmit is refused while In QA in an open phase

Unsubmit (Reporting and IPSR) SHALL be refused, with a clear message, when the result has `in_qa = 1` **and** its phase is open.

#### Scenario: Program tries to pull back a result under review

- GIVEN result A, In QA, in an open phase
- WHEN a program member with the right role unsubmits A with a justification
- THEN the request is refused with a message saying the result is under QA review
- BUT A must NOT change, and no submission row is written

#### Scenario: Old flag in a closed phase

- GIVEN result B, with `in_qa = 1` left over from 2024 in a closed phase
- WHEN unsubmit is attempted
- THEN the guard does not apply. Unsubmit behaves exactly as today.

- Results with `in_qa = 0` behave exactly as today.

### Requirement QIN-R-7: Write boundary

Intake and release SHALL write only:
- `result.in_qa`;
- `result.status_id`, from 3 to 2, and only for outcome `qaed`;
- the audit record.

- They write no other column, table or `qadb` object.
- They never write to a result that is not in the requested phase year.

### Requirement QIN-R-8: Batch failure is all-or-nothing

If a call fails for a reason other than a per-id reason (for example, the database errors), the response SHALL be a generic 500 with a fixed message, and **no** id of the batch is changed.

- The 500 body names no table, column or SQL.

### Requirement QIN-R-9: Responses report every id

Both routes SHALL answer 200 with every requested id in exactly one of two lists.

- Intake: `taken` with `{result_id, result_code, changed}`, or `not_taken` with `{result_id, result_code|null, reason}`.
- Release: `released` with `{result_id, result_code, outcome}`, or `not_released` with `{result_id, result_code|null, reason}`.
- The order is request order.
- The response echoes `phase_year`.

### Requirement QIN-R-10: Contract documentation

`onecgiar-pr-server/docs/qa-catalog.en.md` SHALL gain an "Intake and release" part and a change-log row covering:
- routes, auth and limits;
- outcomes and reasons;
- the idempotency and audit rules;
- the unsubmit effect.

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Concurrency | An intake or release racing with an unsubmit of the same result never leaves `in_qa = 1` on an Editing result, nor QAed on a result that was unsubmitted. The state is re-checked and changed under a row lock in one transaction |
| Performance | p95 ≤ 2 s for a batch of 50 on prtest. The number of statements does not grow per id beyond the batched writes |
| Observability | One log line per call: route, phase year, counts (changed, unchanged, rejected), duration. Never the key, an id list or values |
| Security | The routes write only what QIN-R-7 lists. The calling platform comes from the guard, never from the body |
| Compatibility | The feed routes, the catalog and `catalog_version` are unchanged. Existing unsubmit behavior is unchanged except for QIN-R-6 |

## 7. Defect classes and their gates

| Defect class | Gate |
|---|---|
| A wrong id is changed (an ineligible id is taken, or the wrong row is updated) | Jest with real eligibility SQL fixtures, a mixed-batch falsifier, and a live check on the dev/test DB comparing before and after |
| Partial batch on failure | Jest: inject a failure on the audit insert → assert nothing changed |
| Race with unsubmit | Jest asserting the lock and re-check (the statement order). **No automated true-concurrency test**: substitute a two-session manual check on the dev/test DB at the HITL pause |
| Unsubmit guard bypass (IPSR path forgotten) | Jest on both `unsubmitFunction` and `unsubmitFunctionIPSR`, plus a consumer grep for every unsubmit entry point |
| Auth bypass | Controller metadata test (the decorator is really present), JWT exclude-list spec, live 401 without a key |
| Compile-only defect (entity, DTO) | `npx tsc --noEmit` |
| Migration drift | `npm run migration:check` |
| Downstream breakage from new status-2 writes (versioning, replication, ToC coverage) | Consumer sweep of `status_id = 2` readers in the design. **Not automatable end-to-end**: recorded and checked at the HITL pause |

## 8. Requirement ID Index

| ID | Title |
|---|---|
| QIN-R-1 | Service authentication |
| QIN-R-2 | Request validation |
| QIN-R-3 | Intake marks eligible results In QA |
| QIN-R-4 | Release ends QA with an outcome |
| QIN-R-5 | Every change is recorded |
| QIN-R-6 | Unsubmit refused while In QA in an open phase |
| QIN-R-7 | Write boundary |
| QIN-R-8 | Batch failure is all-or-nothing |
| QIN-R-9 | Responses report every id |
| QIN-R-10 | Contract documentation |

## 9. Open Questions

| # | Question | Owner |
|---|---|---|
| OQ-1 | `result_qaed_log.qaed_user` is a NOT NULL FK to `users`, and a platform is not a PRMS user. Is the QAed record written there (nullable user + platform), or only in the new audit record? Settled at design | Juan David |
| OQ-2 | Should outcome `qaed` also write a `submission` history row, as submit and unsubmit do? Test has no `submission` row with `status_id = 2` | Juan David |
