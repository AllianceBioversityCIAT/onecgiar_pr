# Proposal — Bilateral: primary Science Program request (Accept as primary / Decline)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `notifications/bilateral-primary-sp-request` |
| **Slug** | `bilateral-primary-sp-request` (given as a path by the user) |
| **Type** | Change (new request kind + acceptance lifecycle, server + client) |
| **Approval Mode** | gated (default) |
| **Status** | approved (Santiago Sanchez, 2026-09-30) |
| **Owner** | Santiago Sanchez |
| **Date** | 2026-09-30 |
| **Ticket** | none. Source: direct product rules from the user, 2026-09-30 (screenshot: "Set up bilateral result" drawer, project B-A1634, SP09 70% / SP12 30%) |
| **Depends on** | `notifications/inbox-revamp` (merged `487200d8a`; its row, drawer and tabs are reused) |
| **Parallel-safe** | no. It shares `share-result-request.service.ts`, `notification-item.*` and `contribution-request-drawer.*` with `inbox-revamp` and `notifications/bilateral-contributor-tagging` |
| **Supersedes** | the discarded `notifications/bilateral-sp-assigned-notification` idea (informative "SP assigned" row); not written to disk |
| **Baseline cited** | `docs/prd.md` US-S3 · `docs/trd/trd.md` `Notification` + `results` modules · `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` · `onecgiar-pr-client/CLAUDE.md` |

---

## 2. Intent

When a Center creates a bilateral result and picks its primary Science Program, **that SP has to accept the result before it becomes theirs**. Contributing SPs are asked to accept only **after** the primary has accepted.

---

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P-1 | Choosing the primary SP writes the owner row (`results_by_inititiatives`, `initiative_role_id = 1`) directly. The SP never agrees to it and is not told | `bilateral.service.ts:464-477` (`createResultHeader`), `:4777` (`populateInitiativeAndTocFromProgramCode`, called by `promoteDraft`, `bilateral-ai.service.ts:804`), `bilateral-center.service.ts:347-368` (`updatePrimaryAssignment`) |
| P-2 | There is **no "primary" request kind**. `share_result_request` cannot tell primary from contributor, and its accept path hardcodes contributor | `share-result-request.service.ts:1386` (`createNewInitiativeEntry` → `initiative_role_id = 2`) |
| P-3 | Contributing SPs saved by the Center stay as status-4 drafts until the **SP approves the review**; only then do they become pending requests | `bilateral-center.service.ts:1698` (`syncContributingPrograms`), `results.service.ts:4316-4344` → `_updateTocMapping` L4684 → `resultRequest` L4769 |
| P-4 | The SP only finds out about a bilateral result at *Submit for review* (`BILATERAL_RESULT_SUBMITTED`) | `bilateral.service.ts:676` |

---

## 4. Proposed Outcome

| Situation | What happens |
|---|---|
| Center presses **Create result** (AI draft → result, or manual create) with SP09 as primary | A **pending primary request** is created. SP09 members and admins see: *"Bioversity (Alliance) has tagged SP09 as the primary Science Program of result {result_code} - {result_title}"* with **Accept as primary / Decline** |
| The AI job finishes | Nothing. The trigger is Create result, not the job |
| While the request is pending | The result is **on hold**: no owner row, so it does not count as SP09's anywhere (lists, counts, review queue). Submit for review stays blocked (it already requires an owner, `bilateral-center.service.ts:2396-2404`) |
| SP09 **accepts** | SP09 becomes the owner (role 1). Contributing SPs the Center already saved (e.g. SP12) now get their **contributor request with Accept/Decline**: *"SP09, as primary Science Program, has tagged SP12 as a contributing Science Program to result {result_code} - {result_title} on behalf of Bioversity (Alliance)"* |
| SP09 **declines**, project has **exactly 2** SP alignments | A new pending primary request goes automatically to the other SP (SP12) |
| SP09 **declines**, project has **more than 2** alignments | Back to the Center: the result has no primary and the Center picks another, which creates a new request |
| Project has **1** SP (100%) | Same: the SP must accept |
| Center adds SP12 as contributor **before** the primary accepts | SP12 gets nothing until the primary accepts |
| Center adds SP12 as contributor **after** the primary accepted | SP12 gets its contribution request when the Center saves the contributors section |

Who sees a primary request: **all members of the SP + platform admins + SP admins** (Lead/Co-lead/Coordinator).

---

## 5. Scope

**Server**
- `share_result_request`: add a column that marks the request kind (e.g. `request_type: 'primary' | 'contribution'`, default `'contribution'` for every existing row), plus a migration. Decide `owner_initiative_id` for a primary request (it is `NOT NULL`; proposal: the proposed SP).
- A single "request primary SP" function, called by the **three** paths that set a primary today (`createResultHeader`, `promoteDraft`, `updatePrimaryAssignment`). None of them writes the role-1 row any more.
- **Accept (primary):** write the role-1 row, then turn the Center's saved contributor drafts (status 4) into pending contribution requests (status 1).
- **Decline (primary):** count the project's SP alignments (`clarisa_project_mappings`, same filter as `bilateral-projects.service.ts:401-414`). 2 → new request to the other SP. >2 (or 1) → the result goes back to the Center with no primary.
- Contributors saved while the primary is pending: stay as drafts; do not fail on the null owner (`syncContributingPrograms`, L1708-1712, 1806).
- Contributors saved after the primary accepted: become pending requests on save.
- Recipients: SP members (`getUserIdsByInitiative`) + platform admins (new query: `role_by_user` role 1, app-level, `RoleByUser.repository.ts:20-43`).
- Guards on the code that assumes an owner exists (see R-2).

**Client**
- Inbox row + drawer: a pending primary request renders in the existing Requests-origin row with its own sentence, chip ("Primary program request") and buttons **Accept as primary / Decline**, using `inbox-revamp`'s row/drawer and a new or branched endpoint.
- Center side: when the primary request is pending or was declined, the result shows it (e.g. "Awaiting SP09 acceptance" / "Declined by SP09, pick another primary"), and the Project Information card lets the Center pick again when it was sent back.

---

## 6. Non-Goals

- Results that already have an owner (role 1) today: **no backfill**, they are not asked to accept.
- The API ingest path (`bilateral.service.ts:575`): results born in Pending Review from external platforms keep today's behavior. **Pending OQ-6.**
- Non-bilateral (W1/W2) results.
- Email. The existing contribution emails keep their current behavior; no new email.
- The AI-job notification cleanup (paused until the AI-job owner confirms; see the discarded proposal note).
- Changing how the SP **review** (approve/reject of a submitted result) works, except where drafts are no longer converted there (see MODIFIED).

---

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Center users | Results wait on SP acceptance; they may be sent back to pick another primary |
| SP members, SP admins, platform admins | New actionable request in the inbox |
| `share-result-request.*` (entity, service, controller) | New kind, accept/decline branches |
| `bilateral.service.ts`, `bilateral-ai.service.ts`, `bilateral-center.service.ts` | Stop writing role 1 directly; call the request function |
| `results.service.ts` `_updateTocMapping` | Null-owner guard; no longer the place drafts are converted for bilateral results (see OQ-4) |
| `RoleByUser.repository.ts` | Platform-admin recipients |
| `notification-item`, `contribution-request-drawer`, `results-api.service.ts` | New row kind + buttons |
| `section-zero-dashboard` (Project Information card) | Pending/declined state, pick again |
| `notifications/inbox-revamp`, `notifications/bilateral-contributor-tagging`, `notifications/bilateral-review-decision` | Related; the request row shape is shared |

---

## 8. Visual Reference

- Source: mockups supplied by the user (2026-09-30)
- Location: `docs/specs/notifications/bilateral-primary-sp-request/mockup/`

| File | Shows |
|---|---|
| `set-up-bilateral-result-drawer.png` | Trigger context: "Set up bilateral result" drawer, *Select Primary Science Program* (B-A1634, SP09 70% / SP12 30%) |
| `primary-program-request-row.png` | **Primary request row** |
| `contributor-request-row.png` | **Contributor request row** (sent after the primary accepts) |

**Primary request row** (`primary-program-request-row.png`)
- Icon: flag, in a light violet square.
- Line 1: *"{Center acronym} has tagged **{SP code}** as the primary Science Program of result **{result_code}** - {result_title}"*. The SP code and result code are bold monospace; the title is a violet link. Example: *"IITA has tagged SP01 as the primary Science Program of result 9391 - Cassava mosaic surveillance dashboard for West Africa"*.
- Line 2: chip **"Primary program request"** (filled blue pill) · funding badge `W3/Bilateral` (outlined) · level · type text (`Output · Knowledge Product`) · relative time.
- Line 3: buttons **"Accept as primary"** (violet outline) and **"Decline"** (grey outline).
- A violet left accent bar marks the pending/unread row.

**Contributor request row** (`contributor-request-row.png`)
- Icon: people/group, in a light violet square.
- Line 1: *"**{primary SP code}**, as primary Science Program, has tagged **{contributor SP code}** as a contributing Science Program to result **{result_code}** - {result_title} on behalf of {Center acronym}"*. Example: *"SP03, as primary Science Program, has tagged SP01 as a contributing Science Program to result 9385 - Maize seed regulation reform in Zambia on behalf of CIMMYT"*.
- Line 2: chip **"Contributor request"** (filled violet pill) · `W3/Bilateral` · `Outcome · Policy Change` · relative time.
- Line 3: buttons **"Accept"** and **"Decline"**.

- Notes: both rows reuse the `inbox-revamp` 3-line layout (`NOTIF-T-15`). **Deviations from `inbox-revamp` to settle in specify:** (a) that spec settled on a single "Contribution request" chip and an **"Accept contribution"** button (`NOTIF-T-12`), while these mockups add two distinct chips and use plain **"Accept"** on the contributor row; (b) per-kind row icons (flag / people) replace the initials avatar. No mockup yet for the Center-side "Awaiting acceptance / Sent back" state; offered at specify time.

---

## 9. Requirement Delta Preview

### ADDED
- A **primary SP request** kind with its own lifecycle: pending → accepted | declined.
- Creating a bilateral result with a chosen primary SP creates a pending primary request instead of an owner row.
- Accept as primary writes the owner row and releases the contributor requests.
- Decline moves the request to the only other aligned SP, or sends the result back to the Center.
- Platform admins are recipients of primary requests.
- The Center sees when its result is awaiting acceptance or was sent back.

### MODIFIED
- `createResultHeader`, `promoteDraft` and `updatePrimaryAssignment` no longer write `initiative_role_id = 1` directly.
- **Contributor timing:** for bilateral results, saved contributor drafts become pending requests **when the primary accepts** (or on save after that), instead of when the SP approves the review.

### REMOVED
- The silent, unconfirmed primary assignment for newly created bilateral results.

---

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Pending primary lives in `share_result_request` (new `request_type`); no owner row until accept** | Reuse the request table, statuses 1/2/3 and the inbox Requests pipeline | "Doesn't count as SP09's" happens for free, since every SP query needs an active role-1/rbi row. Reuses row, drawer, admin visibility (`share-result-request.service.ts:572-588`). One small migration | Code that assumes an owner must be guarded (R-2). The accept endpoint needs a primary branch |
| B. Write the owner row but mark it `pending` (flag on `results_by_inititiatives`) | Keep role 1, add a state | Fewer null-owner paths | **Every** SP query (lists, counts, P25 validation SQL, ~20 report queries) would have to learn to exclude pending rows, and missing one leaks the result to the SP. Higher risk than A |
| C. New result status "Awaiting SP acceptance" | Add a status 9 | Very visible | Status is used for the QA/review lifecycle and versioning, so it collides with Editing/Draft semantics. Still needs the request data somewhere |

## 11. Recommended Approach

**Option A.**
- The research shows the code already treats "no owner" as a valid state in the Center flow: `getOwnerInitiativeByResult` returns undefined, `getTocState` returns empty, and `submitForReview` blocks until there is an owner. The unsafe spots are few and known (R-2).
- The pending request row **is** the inbox item, as for today's contribution requests (`share-result-request.service.ts:256-263`). No new notification type is needed for the request itself.
- Accept/Decline gets a primary branch in the existing `results/request/update` flow, or a sibling endpoint. That is decided in specify.

**Size:** L (server-heavy). Could be split into two chunks if preferred: (1) primary request lifecycle, (2) contributor release on accept. Recommendation: **one spec**, because (2) is small and only makes sense with (1).

---

## 12. Risks, Dependencies, And Open Questions

### Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | **Notification read paths hide ownerless results.** `notification.service.ts:617, :630, :706` require `initiative_role_id: 1`, so result notifications (created/submitted…) for a pending result don't show | Acceptable while pending (the request row itself is visible via the Requests pipeline); verify in specify |
| R-2 | **Null-owner crashes:** `_updateTocMapping` reads `initSubmitter.initiative_id` without a null check (`results.service.ts:4719-4726`); `syncContributingPrograms` saves a null `owner_initiative_id` into a `NOT NULL` column (`bilateral-center.service.ts:1708-1712, 1806`); contribution emails use `initOwner.id` (`share-result-request.service.ts:324`) | Guard each; regression tests per path |
| R-3 | **Versioning** throws without a role-1 row (`versioning.service.ts:1143`). A result still pending at phase rollover would break replication | Decide: skip pending results at rollover, or block rollover (OQ-7) |
| R-4 | **Contributor timing change** for bilateral results diverges from W1/W2 and from the review-approval conversion in `_updateTocMapping`; the two must not both convert the same draft | Make the conversion idempotent (only status 4 → 1); bilateral-only branch |
| R-5 | Inbox routing uses `is_map_to_toc` to decide who sees a request (`share-result-request.service.ts:572-588`) | Primary requests route to the proposed SP's users (`is_map_to_toc = false` semantics) + admins |
| R-6 | Shared files with 3 sibling notification specs | Sequence; not parallel-safe |

### Open Questions (proposed defaults in brackets)

| ID | Question |
|---|---|
| OQ-1 | Decline on a **1-SP** project: back to the Center with nothing else to pick? [yes, back to Center; the Center can change the project or contact the SP] |
| OQ-2 | On a 2-SP project, **both** decline (SP09 then SP12): what happens? [back to the Center] |
| OQ-3 | Is the **Center notified** when its result is declined, auto-moved or accepted? [yes, one informative row each, to the lead Center's users, like `share-result-request.service.ts:1160`] |
| OQ-4 | When SP12 is auto-moved to primary, is it removed from the contributor list if it was there? [yes, `updatePrimaryAssignment` already does this, L325-345] |
| OQ-5 | Center **changes** the primary while a request is pending: cancel the old request and create a new one? [yes] |
| OQ-6 | API ingest (external platforms, born in Pending Review): also require acceptance? [no, out of scope] |
| OQ-7 | Pending primary requests at phase rollover? [skip the pending result from replication and log it] |
| OQ-8 | Can the SP **decline with a reason** (free text)? [not in this spec] |
| OQ-9 | Labels: settled by the mockups (primary: "Primary program request", "Accept as primary" / "Decline"; contributor: "Contributor request", "Accept" / "Decline"). Open: do W1/W2 and older contribution rows keep `inbox-revamp`'s "Contribution request" + "Accept contribution", or switch to the new contributor wording? [keep the old wording for rows that are not bilateral contributor requests] |
| OQ-10 | Bilateral contributor request **direction**: today the owner/requester/approver columns flip on `is_map_to_toc`. In the mockup the *primary SP* is the tagger, so the request goes from the owner to the contributor SP [route to the contributor SP's users + admins] |

---

## 13. Success Criteria

- Create a bilateral result on B-A1634 with SP09 primary → SP09 members **and** a platform admin see the request with Accept as primary / Decline; the result appears in **no** SP09 list or count until accepted.
- SP09 accepts → SP09 is the owner; SP12 (already saved as contributor) now sees its contribution request with Accept/Decline.
- SP09 declines on a 2-SP project → SP12 gets the primary request automatically. On a 3-SP project → the Center is asked to pick again.
- Creating a result never fails because of the request/notification step (test-proven).
- `npm run migration:check` green; regression tests for each R-2 guard.

---

## 14. Next Step

```text
/akili-specify notifications/bilateral-primary-sp-request
```
