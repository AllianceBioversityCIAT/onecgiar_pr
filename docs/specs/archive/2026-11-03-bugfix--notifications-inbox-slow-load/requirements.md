# Requirements — Notifications Inbox Slow Load (Lite, Bug Mode)

## 1. Module / Feature

- **Module:** `results` (`share-result-request` sub-module) — surfaced through `notifications`
- **Sub-feature:** Received/Sent contribution-request query performance
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Type:** Bug
- **Related spec:** `docs/specs/notifications/inbox-revamp/` (just shipped; blocked from manual testing by this bug)

## 2. Context

The Notifications inbox (`docs/prd.md` — notifications goal; `notifications/inbox-revamp` spec) reads its Received/Sent feeds from `GET /api/results/request/*`, backed by `ShareResultRequestService.getReceivedResultRequest` / `getSentResultRequest` in `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts`. Confirmed in code (not a guess — see Bug Diagnosis below): each call issues 3 relation-heavy TypeORM queries **sequentially** (not parallelized), and for admin users two of those three are the exact same query issued twice. The page is slow enough to block manual QA of the just-shipped inbox-revamp work.

## 3. In Scope / Out of Scope

### In scope

- Parallelizing the 3 `getRequest()` calls inside `getReceivedResultRequest` and `getSentResultRequest`.
- Eliminating the redundant duplicate query for admin users (`role === 1`) in `buildWhereReceivedConditions` / `buildWhereSentConditions`.
- Batching `enrichRequestsWithTocContributionReview` across the combined result set instead of once per bucket.

### Out of scope

- Any change to notification content, badges, filters, layout, or the `notifications/inbox-revamp` spec's shipped behavior.
- The `updates` feed (`GET_requestUpdates`) — already uses `Promise.all`, not implicated.
- Client-side changes — investigation confirmed the client fetch/render path (`results-notifications.service.ts`, per-row getters, filter pipes) does no per-row HTTP calls and is not the bottleneck.
- Collapsing the 3 queries per feed into a single merged query (Option B in the proposal) — deferred until profiling after this fix shows it's still needed.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Any user opening Notifications | Received/Sent tabs load with fewer round trips; no visible behavior change. |
| Admin users (`role === 1`) | No longer pay for a duplicated query on every page load — largest relative improvement. |

## 5. User Stories

- **PERF-US-1** — As any PRMS user, I want the Notifications inbox to load quickly, so that I can act on requests without waiting on redundant backend queries.

## 6. Functional Requirements

### Required (MUST)

- **PERF-R-1** `getReceivedResultRequest` and `getSentResultRequest` MUST issue their 3 `getRequest()` calls (`pendingOwner`, `pendingShared`, `done`) concurrently (`Promise.all`), not sequentially awaited.
- **PERF-R-2** When `role === 1` (admin), the where-conditions builder MUST NOT cause the identical query to be issued twice for `pendingOwner` and `pendingShared` — the shared result MUST be reused for both branches.
- **PERF-R-3** `enrichRequestsWithTocContributionReview` MUST be invoked at most once per page load per feed (Received or Sent), resolving each unique `(result_id, initiative_id)` pair exactly once across all 3 buckets combined, not once per bucket.
- **PERF-R-4** The row content and count returned by `getReceivedResultRequest` / `getSentResultRequest` MUST be unchanged (byte-identical JSON shape and values) for every existing caller — this is a performance-only fix, not a behavior change.

### Should (SHOULD)

- **PERF-R-10** The fix SHOULD reduce heavy relation-query count per page load from up to 6 (3 Received/Sent × non-parallel × admin duplication) to at most 2 per feed, run in parallel.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Received/Sent response time should drop roughly in proportion to query-count reduction (parallelizing 3 sequential heavy queries into concurrent ones, removing 1 duplicate query for admins, collapsing N per-bucket ToC lookups into N total). No numeric SLA existed before this fix; the acceptance bar is the regression test's query-count assertions (PERF-AC-2/3), not a wall-clock target. |
| **Backwards compatibility** | MUST be additive/neutral — no response shape change for any existing consumer (`results-notifications.service.ts` client, `getReceivedResultRequestPopUp`, any other caller of `getRequest`/`buildWhereReceivedConditions`). |
| **Observability** | No new logging required; existing `_logger` error paths untouched. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PERF-AC-1` | A non-admin user with both owner-side and shared-side pending/done requests | `GET /api/results/request/received` (and `/sent`) is called | The response's `receivedContributionsPending`/`receivedContributionsDone` (or Sent equivalents) content and count are identical to pre-fix behavior. |
| `PERF-AC-2` | Any call to `getReceivedResultRequest` / `getSentResultRequest` | The 3 `getRequest()` calls run | They execute concurrently (`Promise.all`), verified by a spy/mock call-order or timing-based test — not 3 sequential awaits. |
| `PERF-AC-3` | An admin user (`role === 1`) | `getReceivedResultRequest` / `getSentResultRequest` is called | The underlying `getRequest()` for the admin's single where-condition is invoked once, not twice, for the pendingOwner/pendingShared pair. |
| `PERF-AC-4` | A user whose pending/done requests include `is_map_to_toc` rows spanning more than one bucket (e.g., the same `(result_id, initiative_id)` pair appears in both `pendingOwner` and `done`) | The feed is fetched | `getContributionReviewTocByResultAndInitiative` is called at most once for that pair per page load, not once per bucket it appears in. |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization, `AC-9` Security and secrets.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `ShareResultRequestRepository`, `ResultsTocResultRepository.getContributionReviewTocByResultAndInitiative`.

### Downstream consumers

- `onecgiar-pr-client` `results-notifications.service.ts` (`GET_allRequest` / `GET_sentRequest`), and the already-shipped `notifications/inbox-revamp` UI that renders their output.
- `getReceivedResultRequestPopUp` shares `buildWhereReceivedConditions` and `getRequest` — must keep working with the same admin-dedupe fix applied, since it hits the same code paths.

### Assumptions

- No caller relies on the specific *order* the 3 buckets' underlying queries execute in (only on the final merged/deduped result) — confirmed by reading `combineAndDistinct`, which is order-independent (dedupes by `share_result_request_id` into a `Map`).

## 10. Open Questions

None blocking — the one architectural question raised in the proposal (whether to collapse the 3 queries into 1 with an `OR` where-array, i.e. Option B) is explicitly deferred to post-fix measurement, not resolved here.

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — notifications/collaboration goal (no NFR previously specified a numeric latency target for this endpoint; this spec establishes the query-count-based bar above in lieu of one).
- `docs/trd/trd.md` — `api/results/share-result-request` module.
- `docs/specs/notifications/inbox-revamp/` — the feature this bug blocks manual testing of; no requirement or design changes needed there.
