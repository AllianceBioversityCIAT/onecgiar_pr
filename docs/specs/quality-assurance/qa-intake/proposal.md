# Proposal — QA intake marks `in_qa` automatically (`quality-assurance/qa-intake`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `quality-assurance/qa-intake` (slug derived from the free-text argument) |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Owner | Juan David Delgado |
| Date | 2026-10-29 |
| Requirement source | Owner decisions in chat, 2026-10-29. QA platform questions Q8/Q9. Jira ticket: [P2-4040](https://cgiarmel.atlassian.net/browse/P2-4040) (sub-task of P2-3905, created 2026-10-29) |
| Depends on | `quality-assurance/qa-results-feed` (executed, deployed on `performance-refactor`) |
| Parallel-safe | yes. It shares no migration with the feed. It touches `api/qa-catalog` (new route) and `results/submissions` (unsubmit guard) |

## 2. Intent

When QA takes a Submitted result into its review, Reporting must know it **without anyone running SQL by hand**. QA confirms which results it took, and PRMS sets `result.in_qa = 1` for them. While a result is in QA, its program cannot pull it back by itself. When QA reopens a result for adjustments, the flag is cleared again.

## 3. Problem / Current Behavior

- **Nothing in the application writes `in_qa`.** The Reporting team sets it with a manual UPDATE when Submitted results are handed to QA (owner, 2026-10-29). Checks run on the test DB on 2026-10-29:
  - no code writes it: `grep -rn in_qa onecgiar-pr-server/src` finds reads only;
  - the only trigger on `result` is `result_auto_code` (BEFORE INSERT), and no event touches it;
  - the only routine that mentions it is `get_qa_info`, which reads it.
- **It drives what users see.**
  - The "QA in progress" badge (`prdb.get_qa_info`, *Case 1*) and the "In QA" tag in the client (`onecgiar-pr-client/src/app/shared/services/api/api.service.ts:195`).
  - The AI Review lock when the global parameter `pgv_in_qa` is on (`panel-menu.component.html:52-54`). `pgv_in_qa` is `0` in test.
- **The QA results feed is read-only by design and does not set it.**
  - The feed is `GET /api/qa/results` + `POST /api/qa/results/details`, spec `qa-results-feed`, design §7.
  - Once QA pulls through the feed, the manual handoff disappears, and with it the badge and the lock.
- **Unsubmit ignores QA state.** `SubmissionsService.unsubmitFunction` checks the role, existence and status, never `in_qa` (`onecgiar-pr-server/src/api/results/submissions/submissions.service.ts:177-233`). A program can pull a result back while QA is reviewing it.
  - This was raised as Q2 in `qa-results-feed`: QA reopens results so programs can adjust, so the block depends on the QA round. It was deferred to a separate spec.
- **QAed status write-back.** Nothing in PRMS writes `status_id = 2` or `result_qaed_log`: `ResultQaedService` is empty (`api/result-qaed/result-qaed.service.ts:4`) and no repository writes the log.
- **The caller is identifiable.** The CLARISA guard attaches the calling platform to the request (`request[EXTERNAL_PLATFORM_REQUEST_KEY] = validation.mis`, `api/bilateral/guards/clarisa-api-key.guard.ts:51`), so an audit row can name the caller.

## 4. Proposed Outcome

- **Intake.** QA calls an intake route with the ids it took for a `phase_year`.
  - Each id that is still eligible under the feed's rule gets `in_qa = 1` and an audit row.
  - Every other id comes back with the same reason codes the feed uses (`not_found`, `not_submitted`, …).
  - Repeating the call changes nothing (idempotent).
- **Release.** QA calls a release route when it reopens a result.
  - `in_qa` goes back to `0`, with an audit row.
  - The program can then unsubmit and adjust.
- **Unsubmit guard.** While `in_qa = 1`, unsubmit is refused with a clear message.
- **Badge and lock.** They work again automatically through the flag that already exists. No client change is needed for the badge.

## 5. Scope

- `POST /api/qa/results/intake` and `POST /api/qa/results/release`:
  - guarded by the CLARISA key, one permission per route;
  - excluded from JWT, no response envelope, same conventions as the feed;
  - batch limit aligned with `details` (≤ 50).
- Eligibility reused from `QaResultsRepository.classify`, so intake and the feed never disagree.
- A small audit table, written in the same transaction as the flag:
  - result, action (intake/release), calling platform (`mis`), timestamp, phase year.
  - One migration: generate it, then prune it.
- An `in_qa` check in `unsubmitFunction` and `unsubmitFunctionIPSR`.
- Contract doc: `qa-catalog.en.md` gets an "Intake" part and a change-log row.

## 6. Non-Goals

- **Writing the QAed status** (`status_id = 2`, `result_qaed_log`): see Open question OQ-2.
- **Changing the KP badge logic in `get_qa_info`.** A KP with no evaluation already reads as "QA'd by Center knowledge manager" (Q9).
- **Any UI change.** The existing tag, badge and lock are reused.
- **Turning `pgv_in_qa` on.** That is an operations decision per round.
- **Back-filling `in_qa` for past rounds.**

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| QA platform (external) | Calls two new routes and needs two new CLARISA permissions |
| Program submitters | See "In QA" automatically; cannot unsubmit while in QA |
| Reporting team | No more manual UPDATE |
| `qa-results-feed` | Its eligibility is reused, unchanged |
| `results/submissions` | Unsubmit guard |
| `get_qa_info` and the client tag | Consume the flag as before |

## 8. Visual Reference

- Source: None
- Notes: backend-only. The badge and tag already exist.

## 9. Requirement Delta Preview

### ADDED Requirements

- QA can confirm intake of a batch of result ids for a phase year. Eligible ids are flagged `in_qa = 1`, and the others are returned with a reason.
- QA can release a batch of result ids, which clears `in_qa`.
- Every intake and release is recorded with its caller and time.

### MODIFIED Requirements

- Unsubmit (Reporting and IPSR) is refused while the result has `in_qa = 1`.

### REMOVED Requirements

- The manual `in_qa` UPDATE at the start of a QA round, an operational step.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Intake only** | One route sets `in_qa = 1` | Smallest. But a reopened result stays locked forever unless someone runs SQL, and Q2 stays open |
| **B. Intake + release + unsubmit guard** | Two routes, one audit table, a guard on unsubmit | Covers the full round (take → reopen → retake) and closes Q2. About twice the size of A |
| **C. B + QAed write-back** | Also a route that sets `status_id = 2` and writes `result_qaed_log` | Closes Q9's status side as well. But it moves the workflow state machine into an external caller's hands, and the round semantics are not defined yet |

## 11. Recommended Approach

**Option B.**
- Without release, intake creates a lock that only SQL can undo. That only moves the manual step.
- The unsubmit guard is what makes `in_qa` mean something for programs. That was Q2's intent.
- The QAed write-back (C) changes the workflow (`W*` status transitions) and needs its own decision about who owns that state. It stays as OQ-2 rather than being smuggled in.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R-1 | **First write path from an external caller into `result`.** It must be limited to `in_qa`, run in a transaction with the audit row, and leave no other column writable. Review with the security lens |
| R-2 | **The QA platform must adopt two calls.** Until it does, the manual UPDATE remains the fallback. Rollout order: deploy → CLARISA grants → QA integrates |
| R-3 | **Unsubmit guard and data that already exists.** The 29 rows of 2024 with `in_qa = 1` (test) would become non-unsubmittable. Prod is `UNVERIFIED — confirm at source before relying on it`. Decide whether the guard applies only to the open phase |
| OQ-1 | **Does release also apply when QA finishes the round**, or only when it reopens a result for adjustments? In other words, does `in_qa` stay 1 after QA ends? This affects the "QA in progress" badge, which `get_qa_info` shows instead of the evaluation badge while `in_qa = 1` |
| OQ-2 | **QAed status write-back** (`status_id = 2`, `result_qaed_log`): who owns it, QA or Reporting? Is it in this spec or the next one? |
| OQ-3 | **Should intake also require `pgv_in_qa` to be on** (round open)? Should it be refused otherwise? |
| D-1 | Depends on the feed's `classify` (deployed) and on CLARISA granting `/api/qa/results/intake` and `/api/qa/results/release` |

## 13. Success Criteria

- After a QA intake call, the result shows "In QA" in Reporting with no manual SQL.
- Its program gets a clear refusal on unsubmit.
- After release, unsubmit works again.
- The audit table answers "who took/released result X and when" for every change of `in_qa`.
- An ineligible id never gets flagged, and the call returns the same reason the feed would.
- No column other than `in_qa` is written by these routes.

## 14. Next Step

```text
/akili-specify quality-assurance/qa-intake
```
