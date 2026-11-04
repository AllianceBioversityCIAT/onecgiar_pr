# Design — Notifications Inbox Slow Load (Lite, Bug Mode)

Requirements: `docs/specs/bugfix/notifications-inbox-slow-load/requirements.md`.

## 1. Summary

Reduce query count and remove sequential awaits in `ShareResultRequestService.getReceivedResultRequest` / `getSentResultRequest` (`onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts`). No API surface, DTO, entity, or migration changes — this is a pure internal refactor of how the same data is fetched. Biggest constraint accepted: the 3-query-per-feed shape stays (Option B — one merged query — is explicitly deferred); this design only removes waste within that shape.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| PERF-P-1 | `getReceivedResultRequest`/`getSentResultRequest` await their 3 `getRequest()` calls sequentially today | `share-result-request.service.ts` lines 460-468 (Received) and 845-851 (Sent) | Read verbatim: three `await this.getRequest(...)` statements, one per line, not wrapped in `Promise.all` | verified | Design's core fix (PERF-DD-1) would be a no-op; re-diagnose |
| PERF-P-2 | For `role === 1`, `pendingOwner` and `pendingShared` where-conditions are the identical object | `buildWhereReceivedConditions` line 567-575 and `buildWhereSentConditions` line 899-907 | Both branches return the bare `commonConditions` object with no role-specific narrowing when `role !== 1` is false | verified | PERF-DD-2 has nothing to deduplicate; drop that task |
| PERF-P-3 | `enrichRequestsWithTocContributionReview` is called once per `getRequest()` call, i.e. 3x per feed | `getRequest` line 605-631 calls it at the end of every invocation; `getReceivedResultRequest`/`getSentResultRequest` call `getRequest` 3x each | Read call graph directly | verified | PERF-DD-3 targets the wrong function; re-scope |
| PERF-P-4 | `combineAndDistinct` is order-independent (dedupes by `share_result_request_id` via a `Map`, discards nothing based on array order) | `share-result-request.service.ts` lines 822-829 | Read: `new Map(combined.map((item) => [item.share_result_request_id, item]))` — last write wins per key, order only matters if two objects for the same id ever differ, which they cannot (same DB row) | verified | Parallelizing (PERF-DD-1) could change dedup outcome; would need to preserve original array order explicitly |
| PERF-P-5 | No other caller of `getRequest`, `buildWhereReceivedConditions`, or `buildWhereSentConditions` exists besides `getReceivedResultRequest`, `getReceivedResultRequestPopUp`, and `getSentResultRequest` | Grep for `this.getRequest(`, `buildWhereReceivedConditions(`, `buildWhereSentConditions(` within `share-result-request.service.ts` | 3 call sites for `getRequest` (2 in Received-family, 1 in Sent), 2 for each `buildWhere*Conditions` (main + popup for Received; 1 for Sent) — all internal to this file | verified | A fix here could silently affect an unaccounted caller; would need wider grep across the repo |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server module touched:** `onecgiar-pr-server/src/api/results/share-result-request/` (service only — no controller, DTO, entity, or repository interface change).
- **Client modules touched:** none. `onecgiar-pr-client`'s `results-notifications.service.ts` calls the same endpoints with the same contract; it needs no change and is not part of this spec's task list.
- **External integrations touched:** none.

### 2.2 Sequence — before and after

Before (per feed, e.g. Received):

```
getReceivedResultRequest
  await getRequest(pendingOwner)      # heavy query 1
  await getRequest(pendingShared)     # heavy query 2 (identical to 1 if admin)
  await getRequest(done)              # heavy query 3
  each getRequest() internally: await enrichRequestsWithTocContributionReview(mapped)  # N queries, once per bucket
```

After:

```
getReceivedResultRequest
  role === 1?
    yes: single getRequest(commonConditions) result reused for both pendingOwner-equivalent and pendingShared-equivalent
    no:  Promise.all([getRequest(pendingOwner), getRequest(pendingShared)])
  concurrently: getRequest(done)
  enrichRequestsWithTocContributionReview runs ONCE over the union of all rows from the 3 (or 2, for admin) buckets, before re-attaching per-bucket
```

`getSentResultRequest` mirrors the same shape with its own where-conditions.

## 3. Data Model Changes

None. No entity, column, or migration changes.

## 4. API Surface

### 4.1 New / changed endpoints

No endpoint, method, path, DTO, or response-shape changes. `GET /api/results/request/received` and `GET /api/results/request/sent` (and `getReceivedResultRequestPopUp`'s internal usage) keep their exact existing contracts — see PERF-R-4. This section is otherwise not applicable.

### 4.2 Bilateral / platform-report impact

None — this module is not part of `/api/bilateral/*` or `/api/platform-report/*`.

## 5. Server Workflow / Business Rules

- **`getReceivedResultRequest` / `getSentResultRequest` (service):** unchanged responsibility (return the same two response shapes); internal fetch strategy changes from 3 sequential awaits to a mix of reuse (admin) and `Promise.all` (non-admin), per PERF-DD-1/DD-2.
- **`buildWhereReceivedConditions` / `buildWhereSentConditions`:** unchanged output shape (still return `{ pendingOwner, pendingShared, done }`); the caller (not the builder) is what changes to avoid issuing the admin's duplicate query — see PERF-DD-2's alternative discussion for why the fix sits in the caller, not the builder.
- **`getRequest`:** the per-bucket call to `enrichRequestsWithTocContributionReview` is removed from inside `getRequest` (which becomes fetch-and-map only); enrichment moves to a new orchestration step in the two callers that combines all fetched buckets before enriching once, then re-splits the enriched rows back into their original buckets by `share_result_request_id` — see PERF-DD-3.
- **`getReceivedResultRequestPopUp`:** uses the same `buildWhereReceivedConditions` + `getRequest` primitives for its 2-bucket case (no `done`). It gets the admin-dedupe fix for free (PERF-DD-2 lives in the shared caller pattern) but is explicitly NOT required to gain the enrichment-batching fix (PERF-DD-3) since it already only spans 2 buckets and is out of this spec's scope per PERF requirements — however, since `getRequest` itself loses its internal enrichment call (DD-3), the popup path MUST still get *a* single enrichment call after fetching, or ToC review data silently disappears from the popup. This is folded into the same task as DD-3 (see `tasks.md`).
- No transactions, no new background jobs, no notification side effects — this is a read path only.

## 6. Frontend Plan

Not applicable — no client changes (see requirements, Out of Scope).

## 7. Security & Authorization

No change. Existing JWT + role checks on the controller endpoints are untouched; this spec only changes internal service-level fetch orchestration.

## 8. Performance & Capacity

- **Before:** up to 6 sequential heavy relation-queries per page load (3 Received + 3 Sent, none parallelized), 2 of which are wasted duplicates for admins, plus up to 3x redundant ToC-pair lookups per feed.
- **After:** at most 2 heavy relation-queries per feed run concurrently (1 for admins, since their pendingOwner/pendingShared collapse to one fetch), plus the `done` bucket also running concurrently with the others (3-way `Promise.all` for non-admins, 2-way for admins); one enrichment pass per feed regardless of pair overlap across buckets.
- No index changes proposed — the query shape (columns filtered, joins) is unchanged; only the count and concurrency change.
- No caching introduced — deferred, not needed to hit this spec's goal per the proposal's Option C rejection.

## 9. Observability

No new logging. Existing error handling (`_handlersError.returnErrorRes`) is untouched.

## 10. Testing Plan (forward-looking)

- **Unit tests** on `ShareResultRequestService`: mock `ShareResultRequestRepository.find` to assert (a) it is called with `Promise.all`-style concurrency (via call-order/timing or by asserting no `await` blocks between the 3 invocations — e.g. a delayed mock resolving out of call order and asserting all 3 calls were *issued* before any resolves), (b) for `role === 1` the repository `.find()` for the admin condition is invoked exactly once, not twice, (c) `getContributionReviewTocByResultAndInitiative` is invoked exactly once for a `(result_id, initiative_id)` pair that appears in two different buckets.
- **Regression fixture:** existing row-shape/content assertions (if any exist today) must still pass unchanged; if none exist, this spec's regression task adds the row-count/content parity assertions from PERF-AC-1 as new coverage (this IS the mandatory Bug Mode regression test — red before the fix on the "identical output" assertion only if a latent bug is found; otherwise it is a green-before/green-after content-parity proof, with the concurrency and dedupe assertions being the ones that are red before this fix and green after).
- No Cypress / client tests needed — no client change.

## 11. Backwards Compatibility & Migration Plan

No migration. No API contract change. No feature flag needed — this is an internal optimization with identical external behavior (PERF-R-4), safe to ship directly.

## 12. Design Decisions (ADRs)

### PERF-DD-1 — Parallelize the 3 per-feed queries with `Promise.all`

- **Context:** `getReceivedResultRequest`/`getSentResultRequest` await `getRequest(pendingOwner)`, then `getRequest(pendingShared)`, then `getRequest(done)` one after another, tripling wall-clock latency for no reason — the three queries are independent reads.
- **Decision:** Wrap the 3 calls in `Promise.all` (2-way for admins, since PERF-DD-2 collapses `pendingOwner`/`pendingShared` into one).
- **Alternatives considered:** (1) Leave sequential and rely on Option B (single merged query) to fix latency instead — rejected as a bigger, riskier change for a first pass (see proposal). (2) Fire all 3 with `.then()` chains manually — rejected, `Promise.all` is the standard idiom and equally easy to test.
- **Consequences:** Query load on MySQL becomes bursty (3 queries at once) instead of spread out — acceptable given the endpoint is user-triggered (page load), not a batch job; no rate-limiting concern at this call volume.

### PERF-DD-2 — Reuse a single admin fetch instead of issuing the identical query twice

- **Context:** `buildWhereReceivedConditions`/`buildWhereSentConditions` return the *same* `commonConditions` object for both `pendingOwner` and `pendingShared` when `role === 1`, so the caller unknowingly issues two identical `.find()` calls and discards the duplicate in `combineAndDistinct`.
- **Decision:** Fix in the **caller** (`getReceivedResultRequest`/`getSentResultRequest`), not the builder: when `role === 1`, call `getRequest()` once against the shared condition and use that single result for both "pendingOwner" and "pendingShared" roles in the subsequent combine step. The builder's return shape (`{ pendingOwner, pendingShared, done }`) stays unchanged so nothing else that reads it (e.g. tests asserting its shape) breaks.
- **Alternatives considered:** (1) Change the builder to return a single `pending: commonConditions` field for admins and branch in the caller on `role === 1` — rejected as a shape change to a function other tests may assert on, for no added benefit over just deduping in the caller via reference-equality check (`whereConditions.pendingOwner === whereConditions.pendingShared`). (2) Detect duplication generically by deep-equality of the two where-objects — rejected as unnecessarily generic; the `role === 1` condition is already the exact, known trigger.
- **Consequences:** Caller must branch on `role === 1` (or, more robustly, on reference/deep equality of the two where-conditions) before deciding whether to fetch once or twice — a small increase in caller complexity, contained to one `if`.

### PERF-DD-3 — Batch ToC enrichment across all buckets, once per feed

- **Context:** `enrichRequestsWithTocContributionReview` currently runs inside `getRequest`, so it fires once per bucket (up to 3x per feed) and re-resolves the same `(result_id, initiative_id)` pair redundantly whenever it appears in more than one bucket.
- **Decision:** Remove the enrichment call from inside `getRequest` (which becomes a pure fetch-and-map). Add an orchestration step in `getReceivedResultRequest`/`getSentResultRequest`/`getReceivedResultRequestPopUp` that: (1) fetches all buckets (per PERF-DD-1/DD-2), (2) concatenates their rows, (3) calls `enrichRequestsWithTocContributionReview` once over the concatenated set, (4) re-splits the enriched rows back into their original per-bucket arrays (by `share_result_request_id`, since `enrichRequestsWithTocContributionReview` preserves array identity/order per element and only adds a `toc_contribution_review` field).
- **Alternatives considered:** (1) Keep enrichment inside `getRequest` but memoize `getContributionReviewTocByResultAndInitiative` results across calls within one request lifecycle (e.g. a request-scoped cache) — rejected as more moving parts (cache lifetime, invalidation) for the same outcome. (2) Leave per-bucket enrichment as-is and accept the redundancy — rejected, it's exactly the waste this spec exists to remove.
- **Consequences:** `getRequest`'s signature/behavior changes (no longer enriches internally) — every caller (3 call sites, per premise PERF-P-5) must be updated in the same change, including `getReceivedResultRequestPopUp`, which needs its own single enrichment call added (2 buckets, not 3) so it doesn't silently lose `toc_contribution_review` data. This is a **reversion-adjacent** decision (removing an existing per-call behavior from `getRequest`) — challenged: *"what does removing per-bucket enrichment from `getRequest` break?"* Answer: nothing, provided all 3 call sites listed in PERF-P-5 gain the equivalent single-pass enrichment in the same task — tracked explicitly as one task in `tasks.md` covering all 3 sites together, not split across tasks, specifically to prevent this decomposition risk (a partial rollout that fixes 2 call sites and silently drops ToC data on the third).

## 13. Open Gaps & Follow-ups

- **Deferred:** Option B (collapse the 3 `.find()` calls per feed into 1 query with an `OR` where-array) — only pursued if profiling after this fix still shows the page slow (per `requirements.md` Out of Scope).
- **Accepted risk:** no automated wall-clock performance gate exists (or is added) for this spec — the acceptance bar is query-count/concurrency assertions (unit-test-checkable), not a timing SLA, because timing-based test assertions are inherently flake-prone in CI. If the user's real-world perceived speedup after this fix is insufficient, that is a signal to pursue Option B, tracked as a follow-up, not a re-open of this spec.

## Design Budget (Step 2.4)

- **Expected tasks:** 2 (one for PERF-DD-1 + DD-2 together, since they land in the same `if role === 1` branch of the same two methods; one for PERF-DD-3 across all 3 call sites, which must ship together per the reversion-challenge answer above) + 1 regression-test task (may be folded into the same PRs) = **2-3 tasks**.
- **Expected LOC:** ~80-150 lines changed (service logic restructuring across ~4 methods, plus test additions/updates likely doubling that in test LOC).
- **Expected review rounds:** 1-2 (Lite depth, single file, well-scoped; the main FAIL risk is an incomplete DD-3 rollout missing the popup call site, which the Reviewer should catch directly from the diff).

Depth check: `Lite` was chosen in the proposal and the design above resolves to 2-3 small, tightly-scoped tasks in one file — **matches the depth**, no escalation or de-escalation needed.

## Required cross-references

- `docs/specs/bugfix/notifications-inbox-slow-load/requirements.md`
- `docs/trd/trd.md` — `api/results` module (share-result-request is a sub-module of `results`).
- `docs/specs/notifications/inbox-revamp/` — the spec this bug blocks manual testing of.
