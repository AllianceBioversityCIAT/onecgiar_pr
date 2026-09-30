# Proposal — Notifications Inbox Slow Load

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notifications-inbox-slow-load` |
| Type | Bug |
| Approval Mode | gated |
| Related Spec | `docs/specs/notifications/inbox-revamp/` (just shipped; this bug pre-dates it but blocks manually testing it) |
| Author | Leader (AKILI), on request from Santiago Sanchez |
| Date | 2026-09-30 |

## 2. Intent

Make the Notifications inbox (`/result/results-outlet/results-notifications`) load fast enough to actually test the just-built inbox-revamp feature. Right now the page is slow enough that manual QA is blocked.

## 3. Problem / Current Behavior

Opening the notifications page triggers three feeds (Received, Sent, Updates). The two that dominate load time — Received and Sent — are backed by an endpoint that does **3 full ORM queries per call, run sequentially, each with a deep relation graph**, and duplicates work for admin users. This is confirmed in code, not a guess (see Bug Diagnosis).

## 4. Proposed Outcome

The same three feeds load with far fewer round trips and no duplicated queries, so the page becomes usable for manual testing without changing any visible behavior (row content, filters, badges — all of NOTIF-T-1..T-15 — stay exactly as they are).

## 5. Scope

- `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` — `getReceivedResultRequest`, `getSentResultRequest`, `getRequest`, `buildWhereReceivedConditions`/`buildWhereSentConditions`, `enrichRequestsWithTocContributionReview`.
- Possibly `share-result-request.repository.ts` if the fix is best expressed as one query with `OR` conditions instead of three separate `.find()` calls.
- No client-side scope is currently justified (see Diagnosis — the client fetch/render path looks fine); may be revisited if profiling after the server fix still shows slowness.

## 6. Non-Goals

- No change to notification content, badges, filters, or layout (`notifications/inbox-revamp` spec's outcome stays untouched).
- No change to the `updates` feed (`GET_requestUpdates`) — its query already uses `Promise.all` and looks fine.
- No redesign of the ToC contribution-review enrichment's *logic* — only how many round trips it costs.

## 7. Affected Users, Systems, And Specs

- Every user opening Notifications (all roles).
- Admin users worst-affected (see Diagnosis — duplicated query for role `1`).
- Downstream: `results-notifications.service.ts` (client) calls this endpoint via `GET_allRequest`/`GET_sentRequest` — no client change anticipated.

## 8. Visual Reference

- Source: None — this is a backend performance fix with no UI surface change.

## 9. Bug Diagnosis

### Observed Symptom
User: "Este modulo de notificaciones carga super lento, necesitamos mejorar el rendimiento porque así no puedo ni hacer pruebas de lo que se está desarrollando." The notifications inbox takes long enough to load that it blocks manual verification of the recently-shipped inbox-revamp work.

### Reproduction Steps
1. Log in, navigate to Results → Notifications.
2. Observe time-to-render for the Received/Sent/Updates lists (worse the more `share_result_request` rows the user's initiatives have, and worse still for admin users).

### Root Cause (confirmed)

`share-result-request.service.ts`:

1. **`getReceivedResultRequest` (line 454) and `getSentResultRequest` (line 831) each call `getRequest()` three times, sequentially awaited** (`pendingOwner`, `pendingShared`, `done` — lines 460-468 and 845-851), not `Promise.all`'d. Two page loads (Received + Sent) → **6 sequential round trips** to the same heavy query shape before the page has any data.
2. **Each `getRequest()` call (line 605) is a `.find()` with a deep relation graph** (`getRequestRelations()`, line 797): `obj_result` → `obj_version.obj_portfolio`, `obj_result_type`, `obj_result_level`, `result_center_array.clarisa_center_object.clarisa_institution`, `obj_result_by_project.obj_clarisa_project`, plus `obj_requested_by`, `obj_approved_by`, `obj_owner_initiative`, `obj_shared_inititiative`. TypeORM resolves nested relations as JOINs/subqueries — this alone is a heavy query, and it's issued 3x per feed, twice per page load (6x total).
3. **Admin duplication:** in `buildWhereReceivedConditions` (line 537) and its `buildWhereSentConditions` sibling, when `role === 1` (admin), `pendingOwner` and `pendingShared` both resolve to the *identical* `commonConditions` object (lines 567-583) — so an admin's page load runs the **exact same heavy query twice**, then dedupes the results client-side in `combineAndDistinct`. Pure waste for every admin user.
4. **`enrichRequestsWithTocContributionReview` (line 636)** adds one more DB round trip **per unique `(result_id, initiative_id)` pair** across `is_map_to_toc` rows (line 672, `Promise.all` over `pairMap.entries()`), called independently after *each* of the 3 `getRequest()` invocations rather than once over the combined result set — so a user with N distinct ToC-mapped pairs spread across pendingOwner/pendingShared/done pays for the same pair's lookup redundantly if it appears in more than one bucket, and always pays N round trips minimum per bucket.

Net effect for one page load: up to **6 heavy relation-laden queries run one-after-another** (not in parallel) plus a variable number of additional per-pair queries, with admins paying for 2 of those 6 queries needlessly.

### Impact & Scope

- Affects every Received/Sent page load, not just this session's testing.
- No data-integrity or security implication — this is pure latency, `is_active`/soft-delete filtering and role scoping are unaffected by any fix that only changes *how* the same conditions are queried.
- Confirmed NOT the cause: the client (`results-notifications.service.ts`, `results-notifications.component.ts`) fetches these three feeds exactly once via `getAllPhases()` (already fixed for double-fetch in `NOTIF-T-6` rework) and does no per-row HTTP calls — `notification-item.component.ts`'s badge getters (`fundingWindowBadge`, `resultLevelTypeBadge`, etc., from the just-shipped spec) read already-fetched fields, no additional requests. The bottleneck is server-side.

### Fix Strategy

Not cosmetic — this is a logic/query-shape change requiring a regression test (row counts and content must stay identical). Route: `/akili-specify bugfix/notifications-inbox-slow-load` in **Bug Mode**.

Smallest safe correction, in order of impact:

1. **Parallelize the 3 `getRequest()` calls** in both `getReceivedResultRequest` and `getSentResultRequest` with `Promise.all` — zero risk, cuts sequential latency by ~3x immediately.
2. **Skip the redundant admin query**: when `role === 1`, run `getRequest(commonConditions)` once and reuse the result for both `pendingOwner`-equivalent and `pendingShared`-equivalent branches instead of issuing the identical `.find()` twice.
3. **Batch `enrichRequestsWithTocContributionReview`** across the combined result set (after merging pendingOwner+pendingShared+done) instead of once per bucket, so each unique `(result_id, initiative_id)` pair is looked up exactly once per page load, not up to 3 times.
4. *(Optional, larger, only if 1-3 aren't enough after measuring):* collapse the 3 `.find()` calls per feed into one query with an `OR`-style where (TypeORM `where: [...]` array, which the repo already uses for the `done` bucket) — reduces 3 queries to 1 per feed, but is a bigger repository-level change and should only be attempted if profiling after steps 1-3 shows it's still needed.

A regression test must assert that Received/Sent row counts and content are byte-identical before and after, for a fixture covering: non-admin with both owner-side and shared-side rows, admin, and a user with `is_map_to_toc` rows spread across multiple buckets.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Parallelize + dedupe (Recommended)** | Steps 1-3 above: `Promise.all` the 3 queries, skip the admin duplicate, batch the ToC enrichment. | Smallest, safest change; keeps the existing 3-query shape (easy to reason about); should already deliver the bulk of the speedup. |
| B — Single merged query | Step 4: one `.find()` with an `OR` where array per feed. | Fewer round trips still, but a bigger repository change, more surface for a subtle where-clause bug, harder to review quickly. |
| C — Add caching/pagination | Cache the catalog-ish relations or paginate the list. | Overkill for what's actually a query-count/duplication bug; adds complexity not justified by the diagnosis. |

## 11. Recommended Approach

**Option A.** It directly targets the three confirmed root causes (sequential awaits, admin duplication, per-bucket ToC enrichment) with no behavior change and low review risk. Reassess Option B only if post-fix profiling still shows the page slow.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** `combineAndDistinct` dedupes by `share_result_request_id` — after parallelizing, must confirm no ordering assumption elsewhere depends on the old sequential-await timing (none found, but the regression test should cover it).
- **Dependency:** none on the `notifications/inbox-revamp` spec's client code — that spec's work is unaffected and should be re-verified manually once this lands, since it's the reason the user needs the page fast.
- **Open question:** whether Option B (single merged query) is worth doing now or only if Option A isn't enough — deferred to post-fix measurement, per the Fix Strategy above.

## 13. Success Criteria

- Received/Sent page load issues at most 2 heavy relation queries per feed (not 3), and never issues the same query twice for admins.
- ToC contribution-review enrichment issues at most one query per unique `(result_id, initiative_id)` pair per page load, not one per bucket.
- Regression test (red before fix, green after) asserts identical row content for: non-admin (owner + shared rows), admin, and multi-bucket ToC-mapped rows.
- User confirms the page feels fast enough to resume manual testing of `notifications/inbox-revamp`.

## 14. Next Step

```
/akili-specify bugfix/notifications-inbox-slow-load
```
in **Bug Mode** — convert the confirmed root cause above into a fix plan and a mandatory regression test.
