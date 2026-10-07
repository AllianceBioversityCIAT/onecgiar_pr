# Proposal — Reporting platforms resubmit a rejected bilateral result through `create`

> **In one line:** turn the `updated` branch of `resolveResultCodeTarget` (now a 409 placeholder) into an in-place replace that is allowed **only for Rejected results**. Every refusal happens before the first write. Two additive changes go into `result_review_history` (the SP that decided, plus a `RESUBMIT` action).

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-rejected-result` |
| Slug | `resubmit-rejected-result`, derived from the free-text argument (Jira title) |
| Type | **Change** |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 (invoked `/akili-specify`) |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Jira | [P2-3894](https://cgiarmel.atlassian.net/browse/P2-3894). User Story, Open. Epic P2-3094 *Reporting Tool: Q4 2026 Strategic Enhancements* |
| Companion story | The in-app side, where a centre edits a Rejected result in the Reporting Tool. Not linked in Jira yet (see `OQ-6`) |
| Depends on | `changes/bilateral-create-upsert-by-code` (UBC). This spec **reopens and narrows its on-hold `UBC-T-3`/`UBC-T-4`**. See §12 `D-1` |
| Parallel-safe | **no**. It touches the `/api/bilateral/*` create path, the payload contract, `results.service.ts` (review decision) and a migration |
| Cross-repo | `onecgiar_result_functions` (Fetcher) forwards `data.result_code` untouched (verified in UBC 2026-10-01). Producers (STAR, MEL, TIP) must send it |

## 2. Intent

A reporting platform (STAR, MEL, TIP) sends a corrected version of a result that a Science Program **rejected**. PRMS replaces its data and returns it to **Pending Review**, without anyone retyping it in PRMS.

## 3. Problem / Current Behavior

| Today | Where |
|---|---|
| A `create` carrying the `result_code` of an open-phase result is refused with **409** *"Updating an existing result through create is not available yet."* | `api/bilateral/bilateral.service.ts:4527`, `resolveResultCodeTarget` |
| The open-phase status guard allows **Editing, Draft, Pending Review and Rejected**. P2-3894 BR1 allows **only Rejected** | `assertResultCodeStatusIsEditable`, `bilateral.service.ts:~4588` (UBC `R-5`) |
| Without a code, the same result fails as a **duplicate title** | `ensureUniqueTitle`, `bilateral.service.ts:~4631` |
| The rejection is logged in `result_review_history` **without the Science Program that decided it**. It cannot be rebuilt later: the owner changes precisely in the "rejected for belonging elsewhere" case | `results.service.ts:~4349`. Entity `result-review-history.entity.ts` |
| `ReviewActionEnum` has no "resubmitted" value. `UPDATE` already means an in-app centre edit | `bilateral-center.service.ts:414,747,2430`; `results.service.ts:5449,5542` |
| On rejection, every active share request for the result is deactivated | `results.service.ts:~4407` |
| The create's transaction **does not enrol its repositories**. A late throw leaves partial rows (UBC `R-2`) | UBC proposal §3 |

**Effect:** a rejected result that came from an external platform is a dead end. Either a centre user corrects it by hand in PRMS, or it is abandoned.

## 4. Proposed Outcome

`POST /api/bilateral/create` with `data.result_code`:

| Target in the open phase | Outcome |
|---|---|
| **Rejected**, owned by the caller, not a KP, phase open, primary SP allocated to the lead project | **Replace in place.** Same `id` and same `result_code`. Data replaced, status → **Pending Review**. A `RESUBMIT` row is added to the history. The primary SP is notified. Response: `operation: "updated"` + `result_code` |
| Any other status (Editing, QA, Submitted, Discontinued, Pending Review, Approved, Draft) | **409**, naming the `result_code` and the status. Nothing changes |
| Another platform's result / a KP / a primary SP not allocated to the project / no primary SP | **4xx**. Nothing changes |
| Not in the open phase, approved in a previous one | Unchanged: `versioned` (UBC T-2, already shipped) |
| Not found anywhere | Unchanged: 4xx, never created as new |
| No `result_code` | **Identical to today**, including the response |

Every **rejection** (and every decision) records the SP that took it. The history is never trimmed or overwritten.

## 5. Scope

- **The `updated` branch** of `resolveResultCodeTarget` → an in-place replace core: header plus section reset, reusing the create's writers so they replace rather than duplicate. This is UBC T-3/T-4, narrowed.
- **Status guard → only Rejected** (BR1). This modifies UBC `R-5`.
- **Preflight** that runs every refusal before the first write (BR5 / AC9): ownership, KP, status, phase open, primary SP present, **SP ↔ lead-project allocation** (BR8 / AC17-18), duplicate title against *other* results (AC13).
- **SP allocation check:** reuse `PrimaryProgramRequestService.isAligned(leadProjectId, spInitiativeId)` / `getAlignments` (P-7: `clarisa_project_mappings`, `allocation > 0`, `status = 'Confirmed'`, `primary-program-request.service.ts:529-600`). The same rule the Reporting Tool applies.
- **Primary SP of the payload** → ~~always persisted as the requested primary, through the existing acceptance flow (`PrimaryProgramRequestService.request`). It does not become owner directly (`OQ-1`).~~ **Superseded 2026-10-06 (`bilateral/rejected-result-correction`, `RRC-R-17`, task `RRC-T-6`):** always persisted as the primary; a changed primary is assigned directly (`PrimaryProgramRequestService.transferPrimary`), with no ownership request and no acceptance round.
- **Contributors of the payload** → recreate their contribution requests, because the rejection deactivated them (`OQ-2`).
- **History (AC10, AC14-16)** — migration on `result_review_history`:
  - `+ initiative_id` (nullable, FK `clarisa_initiatives`). Written on APPROVE/REJECT and on RESUBMIT. Historical rows stay `NULL`, with no backfill (it cannot be rebuilt reliably).
  - Formalise the real enum + `RESUBMIT`: `enum('APPROVE','REJECT','UPDATE','RESUBMIT')`. Correct the entity values (`APPROVED`/`REJECTED` → `APPROVE`/`REJECT`), which fixes the ownerless PSR decline (`R-1`).
- **Notification** to the primary SP. Reuse `announcePendingReview` (`bilateral.service.ts:685`), the same notification as a first submission (AC11).
- **Contract:** `bilateral-result-summaries.en.md`. A change-log row, plus the error table by status.

## 6. Non-Goals

- Overwriting a result in any status other than Rejected (deliberate, BR1).
- Deleting through the API. Partial updates (PATCH). Knowledge Products.
- Carrying a result across phases (already delivered: UBC T-2).
- Any Reporting Tool UI change (the companion story).
- Portfolio-level analysis of rejection reasons.
- Backfilling `initiative_id` on historical rows.

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| STAR / MEL / TIP | Can close the rejected → corrected → reviewed loop. Callers without `result_code` see no change |
| Science Programs (reviewers) | The result comes back to their queue with a notification. The history shows rejection → resubmission |
| `api/bilateral` (`bilateral.service.ts`, type handlers) | `updated` branch, preflight, section reset |
| `api/results` (`results.service.ts` review decision) | Writes `initiative_id` to the history |
| `api/results/result-review-history` | Entity + migration + repository (reading the SP) |
| `api/results/share-result-request` (`PrimaryProgramRequestService`) | `isAligned` / `getAlignments` reused. Possibly `request()` for the SP change (`OQ-1`) |
| `changes/bilateral-create-upsert-by-code` | `R-2`/`R-9` on hold → superseded by this spec. `R-5` modified |
| Contract doc + Fetcher | Change-log row. The Fetcher needs no changes (it already forwards `result_code`) |

## 8. Visual Reference

- Source: **None**.
- Notes: backend change plus the API contract. The UI side belongs to the companion story.

## 9. Requirement Delta Preview

### ADDED

- Resubmitting a **Rejected** open-phase result through `create` with `result_code`: in-place replace, same `id`/code, → Pending Review, `operation: "updated"`.
- A preflight with no writes for every refusal (status, ownership, KP, phase closed, no primary SP, SP not allocated, duplicate title against another result).
- Primary SP validation against the lead project's allocations (the BR8 rule, now on the API path as well).
- `result_review_history.initiative_id` on every decision, plus the `RESUBMIT` action.
- Notification to the primary SP on resubmission.

### MODIFIED

- UBC `R-5`: editable statuses `{1,8,5,7}` → **`{7}` only**.
- UBC `R-9`: the duplicate title excludes the result itself (it moves from on hold to active, scoped to Rejected).
- The 409 *"…not available yet"* becomes a 409 by status, naming code and status.

### REMOVED

- The 409 placeholder of the `updated` branch.

## 10. Approach Options

### Option A — Replace in place on the existing row *(recommended)*

- ✅ Satisfies AC2 to the letter (same record). History, notifications, contributors and `ResultReviewHistory.result_id` stay attached.
- ✅ The entry point already exists (`resolveResultCodeTarget`), and the guards are already written (`assertCallerMayVersion`, `assertNotKnowledgeProduct`).
- ✅ Narrower than the old UBC T-3: Rejected only, so no conflict with Pending Review or Approved.
- ❌ It needs a section reset so the create's writers replace instead of duplicating (UBC T-4, Open item 2). That is the riskiest surface.
- ❌ The non-transactional create forces a full preflight before the first write.

### Option B — Deactivate the row and create a new one with the same code (the "simple update" from the UBC pivot)

- ✅ Much smaller: reuses the create and the code restore from T-2.
- ❌ **Violates AC2** ("same underlying record, no second result") and AC10/AC16. The history and notifications are keyed by `result_id`, so they would hang off the inactive row. **Discarded.**

### Option C — A dedicated endpoint `POST /api/bilateral/resubmit`

- ✅ An isolated surface, outside the already complex create.
- ❌ The ticket and its *How to test* require **`create` with `result_code`**. It adds contract surface and a new Fetcher route, and duplicates the resolution UBC already built.

## 11. Recommended Approach

**Option A.** It is the only one that meets AC2 without a new contract, and it reuses the UBC resolution and guards. The order of the work:

1. **Migration + history** (`initiative_id`, `RESUBMIT`) and writing the SP in the review decision. Independent, and it delivers AC14 on its own.
2. **Preflight**, before the first write: KP → ownership → status `== Rejected` → phase open → primary SP present → `isAligned` → title against another result.
3. **Replace core:** header + section reset (reusing the per-type writers). Status → Pending Review.
4. **After commit:** `RESUBMIT` row, `announcePendingReview`, webhook/response.
5. **Contract doc** + Jest tests by status (8), ownership, KP, SP not allocated, no-code regression, three-cycle history.

**Model checkpoint:** this phase is T1. The registry says `opus`, and the session is running Opus 5.5, so it complies.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Owner |
|---|---|---|
| `R-1` | **Enum drift in `result_review_history.action`. Verified 2026-10-06 (user, DB):** the real column is `enum('APPROVE','REJECT','UPDATE') NOT NULL`, with rows `UPDATE` 1,741 · `APPROVE` 1,205 · `REJECT` 172. `UPDATE` was added **outside the migrations** (only `1768572302006` exists, with `('APPROVE','REJECT')`). The entity declares `APPROVE='APPROVED'`, `REJECT='REJECTED'`, values that **do not exist** in the DB. The review decision gets away with it because it writes `reviewDecisionDto.decision as any` (`'APPROVE'/'REJECT'`). **Live bug:** `primary-program-request.service.ts:986` (ownerless PSR decline) writes `ReviewActionEnum.REJECT` = `'REJECTED'`, which is not in the enum. In strict mode the insert fails and the decline transaction rolls back (no `''` rows appear in the count). **Decision:** this spec's migration formalises the real enum + `RESUBMIT` (`MODIFY action enum('APPROVE','REJECT','UPDATE','RESUBMIT')`, with a `down` back to the real 3-value state), and corrects the entity values to `'APPROVE'/'REJECT'`, which fixes the decline in passing. The decline bug is recorded and gets its own regression test | Design (resolved) |
| `R-2` | Partial writes: the create is not transactional. Any refusal after the first write breaks BR5/AC9. A full preflight is mandatory, and a test must verify the row is unchanged after each refusal | Design |
| `R-3` | Section reset: the create's writers may duplicate or orphan rows (partners, ToC, evidence, regions/countries). Open item 2 of the ticket. The UBC T-3 attempt-1 FAILs (Innovation Use hoist; region/country/subnational/evidence-duplicate checks) apply here | Design |
| `R-4` | Last write wins against a centre user editing in PRMS (ticket edge case). There is no locking. This is accepted by the ticket | — |
| `D-1` | **Relationship with UBC.** This spec reopens `UBC-T-3/T-4` with a different scope. Proposal: mark UBC `R-2`/`R-9`/T-3/T-4 as *superseded by `bilateral/resubmit-rejected-result`* and close UBC once T-5/T-6 are done. The attempt-1 stash (*"UBC-T-3 attempt 1 … 2026-09-30"*) **does not appear in this checkout's `git stash list`**. **Decided 2026-10-06 (user): rebuild** it from scratch, using the attempt-1 FAILs as known traps | User (resolved) |
| `OQ-1` | **Primary SP change on resubmission (AC17). Resolved 2026-10-06 (user):** what the centre sends always persists, and the centre may resend to whichever SP it wants. ~~The primary in the payload becomes primary **through the existing acceptance flow** (`PrimaryProgramRequestService.request` → `accept`, PSR/PNS). It does not become owner directly. Consequence: if the primary changes, the result reaches Pending Review **pending acceptance** (PNS-R-2: it is not in any queue until the new SP accepts).~~ **Superseded 2026-10-06 (user, `RRC-R-17`):** if the primary changes, it is assigned directly in the same transaction and the result goes to the new SP's queue at once, with the ordinary notice. If the primary is the same and still accepted, it goes straight to its queue. AC3 is interpreted this way in `/akili-specify` | User (resolved) |
| `OQ-2` | **Resolved 2026-10-06 (user):** contributors persist exactly as the centre sends them (e.g. SP06 as contributor stays a contributor). Since rejection deactivates every share request (`results.service.ts:~4407`), the resubmission **recreates the payload's contribution requests**. The BR8 restriction (allocation to the project) applies **only to the primary**; see `OQ-7` for whether it applies at all | User (resolved) |
| `OQ-3` | Which project's allocation applies: the one already stored as `is_lead`, or the payload's? **Default from `OQ-1` ("what the centre sends persists"): the payload's**, falling back to the stored one when the payload carries no lead project | Design |
| `OQ-7` | **Does BR8/AC18 hold?** The user asked that the centre may resend "to whichever SP they want, regardless of what it sends". The ticket (BR8, AC18, edge cases) requires the primary to be **allocated to the bilateral project** (`isAligned`, P-7), the same rule the Reporting Tool applies. Does the allocation restriction hold for the primary, or is any CLARISA SP accepted? | User / PO — **blocks `/akili-specify`** |
| `OQ-4` | Do the platforms forward `result_code` today? (Open item 1.) The Fetcher does forward it (UBC 2026-10-01). The producers are unconfirmed | Ángel / STAR |
| `OQ-5` | Who goes in `created_by` for the `RESUBMIT` row (NOT NULL FK `users`)? Default: `external_submitter`, the same user the create resolves (`bilateral.service.ts:~4377`) | Design |
| `OQ-6` | The companion story (Rejected editable in the app) has no Jira ID. Its status affects `R-4` | PO |

## 13. Success Criteria

- A `create` without `result_code` gives a response and behaviour **identical** to today's (regression test).
- Rejected → resubmit: the same `id` and `result_code`, the new data, **Pending Review**, in the primary SP's queue, with a notification.
- Each of the other 7 statuses → 409 naming the code and the status. The row is unchanged.
- Another platform / KP / SP not allocated (but present in CLARISA) / phase closed / no primary SP → 4xx, with no writes.
- Three cycles (reject A → resend → reject B → resend → reject C → resend → approve): the history shows the 3 rejections in order, each with its justification, SP, user and date, and is still readable after approval.

## 14. Next Step

```text
/akili-specify bilateral/resubmit-rejected-result
```

Standard depth. `R-1`, `D-1`, `OQ-1` and `OQ-2` were closed on 2026-10-06. **`OQ-7`** (whether BR8, the allocation restriction, holds) must be closed before specifying, because it decides whether `isAligned` enters the preflight.

**Endpoint:** the same `POST /api/bilateral/create` with `data.result_code`. There is no PATCH and no new route (Option A). The ticket requires it, and the Fetcher already forwards `result_code`.
