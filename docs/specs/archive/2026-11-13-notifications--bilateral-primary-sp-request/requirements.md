# Bilateral Primary Science Program Request — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| **Module / feature** | `notifications` / `bilateral-primary-sp-request` |
| **Requirement prefix** | `PSR` |
| **Type** | Change |
| **Depth** | Full (migration + ownership lifecycle change + server/client) |
| **Approval Mode** | gated (inherited from `proposal.md`) |
| **Owner** | Santiago Sanchez |
| **Status** | approved (Santiago Sanchez, 2026-09-30) |
| **Date** | 2026-09-30 |
| **Linked** | `proposal.md` (approved 2026-09-30) · `mockup/` (3 images) |
| **Baseline cited** | `docs/prd.md` US-S3, AC-3, AC-5, AC-8 · `docs/ux-ui/design.md` §8 (inbox rows) · `docs/trd/trd.md` `Notification`, `results` (`share_result_request`, `results_by_inititiatives`), `versioning` |
| **Related specs** | `notifications/inbox-revamp` (row/drawer/tabs reused) · `notifications/bilateral-contributor-tagging` · `notifications/bilateral-review-decision` |

---

## 2. Executive Summary

When a Center creates a bilateral result, the primary Science Program it picked must **accept** before the result becomes that SP's. Until then the result has **no owner** and is on hold. A decline either moves the request to the only other aligned SP or sends the result back to the Center. Contributing SPs are asked to accept **only after** the primary has accepted. Both requests show in the notifications inbox with the mockup's wording and Accept/Decline buttons.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Primary SP** | The Science Program that owns the result (`results_by_inititiatives`, `initiative_role_id = 1`) |
| **Primary request** | A pending ask to a SP to become the primary SP of one result |
| **Contributor request** | A pending ask to a SP to become a contributing SP of one result (today's contribution request, bilateral wording) |
| **SP alignment** | A Science Program mapped to the result's lead bilateral project with allocation > 0 and status Confirmed (the percentages in the "Set up bilateral result" drawer) |
| **On hold** | A bilateral result with a pending primary request and no primary SP |
| **Sent back** | A bilateral result whose primary request was declined and that has no other SP to move to; the Center must pick a primary again |
| **Recipients (of a request to SP X)** | Every user with an active role on SP X + every platform admin, minus the user who caused the request |
| **Creating Center** | The result's lead (reporting) Center |

---

## 4. System Context & Scope

### In scope
- A primary request is created on every path where a Center sets the primary SP of a bilateral result: **Create result** from an AI draft, manual create, and changing the primary on the Project Information card.
- Accept / Decline of a primary request, including the decline cascade.
- Contributor requests released when the primary accepts (and on save afterwards).
- Inbox rendering of both request kinds (mockups).
- The Center seeing the on-hold / sent-back state and picking again.
- Informative notifications to the Creating Center on accept, decline and auto-move.

### Out of scope
- Results that already have a primary SP (no backfill).
- The API ingest path (external platforms; results born in Pending Review).
- W1/W2 results and their contribution requests (wording and behavior unchanged).
- Email (no new mail; existing contribution mail unchanged).
- The "Bilateral AI Job Finished" notification cleanup (paused).
- Decline reasons (free text).
- Changes to the SP review decision (approve/reject of a submitted result), except that approval releases any remaining contributor drafts through the same idempotent release used on accept (see `PSR-R-13`; amended 2026-09-30, Pivot PSR-T-6).

---

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| **Center user** (e.g. Bioversity (Alliance)) | The chosen primary SP is a request, not a fact. Sees on hold / sent back. Picks again after a decline. Gets a notification on accept, decline or auto-move |
| **SP member** (any role on the SP) | Receives primary and contributor requests with Accept/Decline |
| **SP admin** (Lead / Co-lead / Coordinator) | Same as SP member (already a SP member by role) |
| **Platform admin** | Receives every primary request, and can accept or decline on the SP's behalf |

- **`PSR-US-1`** As a Center user, I want the SP I pick as primary to confirm it, so that a result is never owned by a SP that didn't agree. *(Refines US-S3)*
- **`PSR-US-2`** As a SP member, I want to accept or decline being the primary of a bilateral result from my inbox, so that only results we own count as ours.
- **`PSR-US-3`** As a SP member, I want to be asked to contribute only after the primary has accepted, so that I don't act on a result whose owner is still undecided.
- **`PSR-US-4`** As a Center user, I want to know when my result was accepted, declined or moved, so that I can pick another primary when needed.

---

## 6. Functional Requirements

### 6.1 Creating a primary request

#### Requirement `PSR-R-1`: Create result sends a primary request instead of assigning the owner

When a Center creates a bilateral result with a chosen primary SP (AI draft **Create result**, or manual create), the system MUST create one pending primary request to that SP and MUST NOT make that SP the owner.

##### Scenario: AI draft promoted with SP09 chosen
- GIVEN project B-A1634 with alignments SP09 (70%) and SP12 (30%)
- AND an AI draft whose chosen primary SP is SP09
- WHEN the Center user presses **Create result**
- THEN the result exists (it has a result code) with **no** primary SP
- AND one pending primary request to SP09 exists for that result
- AND the Recipients of SP09 see it in their inbox (`PSR-R-9`)
- BUT the result MUST NOT appear in any SP09 list, count or review queue
- AND IT MUST NOT have created a primary request when the AI job finished (only when Create result was pressed)

##### Scenario: manual create with a chosen primary SP
- GIVEN the Center completes the manual form with SP09 as primary
- WHEN the result is created
- THEN the behavior is the same as the AI-draft scenario

##### Scenario: single-SP project
- GIVEN a project whose only alignment is SP13 (100%)
- WHEN the Center creates a result
- THEN a pending primary request to SP13 is created (acceptance is still required)

##### Scenario: request step fails
- GIVEN creating the request or its notification fails
- WHEN the Center creates a result
- THEN the result creation MUST still succeed and the failure MUST be logged without secrets
- AND IT MUST leave the result in a state where the Center can retry picking the primary (sent-back state, `PSR-R-7`)

#### Requirement `PSR-R-2`: Changing the primary while it is pending or sent back

When the Center sets the primary SP on the Project Information card of a result that is on hold or sent back, the system MUST cancel any pending primary request for that result and create a new one to the newly chosen SP.

##### Scenario: change SP09 → SP12 while pending
- GIVEN a result on hold with a pending primary request to SP09
- WHEN the Center picks SP12 and saves
- THEN the SP09 request is no longer pending and no longer actionable in SP09's inbox
- AND a pending primary request to SP12 exists
- BUT re-saving the same SP MUST NOT create a second request

##### Scenario: change the primary of a result that already has one (swap)
- GIVEN SP09 is already the primary SP (accepted, or from before this feature)
- WHEN the Center picks SP12 and saves
- THEN a pending primary request to SP12 is created
- AND SP09 stays the primary SP until SP12 accepts (the result keeps working meanwhile)
- AND on accept SP12 replaces SP09; on decline SP09 stays
- AND IT MUST block Submit for review while the swap request is pending

#### Requirement `PSR-R-3`: Only SP alignments can be requested

The system MUST reject a primary request to a SP that is not an SP alignment of the result's lead project, with the same validation message the Project Information card uses today.

### 6.2 Accepting and declining

#### Requirement `PSR-R-4`: Accept as primary

When a Recipient accepts a pending primary request, the system MUST make that SP the result's primary SP, mark the request accepted, and release the contributor requests (`PSR-R-12`).

##### Scenario: SP09 accepts
- GIVEN a pending primary request to SP09
- WHEN a SP09 member presses **Accept as primary**
- THEN SP09 is the primary SP
- AND the result now appears in SP09's lists and counts
- AND the request row shows as accepted for every Recipient (no longer actionable)
- AND the Creating Center receives an "accepted" notification (`PSR-R-14`)
- AND IT MUST be idempotent: a second accept (another member, a stale tab) MUST NOT create a second primary or a second set of contributor requests

#### Requirement `PSR-R-5`: Decline with exactly two alignments moves to the other SP

When a primary request is declined and the lead project has **exactly two** SP alignments, the system MUST automatically create a pending primary request to the other SP.

##### Scenario: SP09 declines on B-A1634
- GIVEN B-A1634 has alignments SP09 and SP12, and SP09 has a pending primary request
- WHEN a SP09 member presses **Decline**
- THEN the SP09 request is declined
- AND a pending primary request to SP12 is created
- AND the Creating Center receives an "auto-moved" notification (`PSR-R-14`)
- AND if SP12 was saved as a contributor, IT MUST be removed from the contributor list (it can't be both)

#### Requirement `PSR-R-6`: Decline with more than two alignments sends the result back

When a primary request is declined and the lead project has **more than two** alignments, the system MUST send the result back to the Center with no primary SP.

##### Scenario: SP09 declines, project has SP09/SP12/SP03
- WHEN SP09 declines
- THEN no new request is created automatically
- AND the result is sent back (`PSR-R-7`)
- AND the Creating Center receives a "declined" notification

#### Requirement `PSR-R-7`: Sent back

A result MUST be sent back when (a) a single-alignment project's only SP declines, (b) on a two-alignment project **both** SPs have declined the current round, or (c) `PSR-R-6` applies. A sent-back result MUST have no pending primary request, and the Center MUST be able to pick a primary again (`PSR-R-2`).

##### Scenario: both SPs decline
- GIVEN SP09 declined and the request moved to SP12
- WHEN SP12 declines
- THEN the result is sent back (it does not bounce back to SP09)

#### Requirement `PSR-R-8`: Who can act

Only Recipients of a request (members of the requested SP, or platform admins) MUST be able to accept or decline it. The server MUST enforce this; hiding buttons is not enough (AC-3).

##### Scenario: user from another SP
- GIVEN a user with roles only on SP12
- WHEN they call accept on a primary request to SP09
- THEN the server rejects it and nothing changes

### 6.3 Visibility in the inbox

#### Requirement `PSR-R-9`: Primary request row

A pending primary request MUST render in the Recipients' inbox as in `mockup/primary-program-request-row.png`:
- sentence: *"{Creating Center acronym} has tagged **{SP code}** as the primary Science Program of result **{result_code}** - {result_title}"*, with the title as a link to the result;
- chip **"Primary program request"**, funding badge, level · type text, relative time;
- buttons **"Accept as primary"** and **"Decline"**;
- flag icon.

It MUST count under **Needs your decision** and appear under the **Received** side. Once accepted or declined it MUST move to **For your information** without buttons.

##### Scenario: missing Center acronym
- GIVEN the Creating Center has no acronym
- THEN the Center name is used, and IT MUST never render an empty name or "()"

#### Requirement `PSR-R-10`: Contributor request row (bilateral)

A pending bilateral contributor request MUST render as in `mockup/contributor-request-row.png`:
- sentence: *"**{primary SP code}**, as primary Science Program, has tagged **{contributor SP code}** as a contributing Science Program to result **{result_code}** - {result_title} on behalf of {Creating Center acronym}"*;
- chip **"Contributor request"**; buttons **"Accept"** / **"Decline"**; people icon.
- BUT W1/W2 and other non-bilateral contribution requests MUST keep today's wording, "Contribution request" chip and "Accept contribution" button (`inbox-revamp` `NOTIF-T-12`).

#### Requirement `PSR-R-11`: Detail panel

Clicking either row MUST open the existing detail drawer, showing the request kind, the requested SP, the result and the Creating Center. For a pending request it shows the same accept and decline actions as the row.

### 6.4 Contributing SPs

#### Requirement `PSR-R-12`: Contributors wait for the primary

For bilateral results, contributing SPs the Center saves MUST NOT receive a contributor request while the result has no primary SP. When the primary accepts, every contributor already saved MUST receive a contributor request (`PSR-R-10`). A contributor saved **after** the primary accepted MUST receive its request when the Center saves the contributors section.

##### Scenario: SP12 saved before SP09 accepts
- GIVEN a result on hold (SP09 pending) and the Center saved SP12 as contributor
- THEN SP12 has no request in its inbox
- WHEN SP09 accepts
- THEN SP12 receives one contributor request with Accept/Decline
- AND saving the contributors section while on hold IT MUST NOT fail

##### Scenario: SP03 saved after SP09 accepted
- GIVEN SP09 is primary
- WHEN the Center adds SP03 as contributor and saves
- THEN SP03 receives one contributor request
- BUT re-saving without changes MUST NOT create a second request for SP03

#### Requirement `PSR-R-13`: Review approval releases remaining drafts idempotently

> Amended 2026-09-30 (Pivot Record PSR-T-6, approved by Santiago Sanchez). The original text said approval "no longer releases" drafts, on the premise that none would remain after `PSR-R-12`. That premise is false for API-ingest results (out of scope, P-3) and for results already in flight at deploy (no backfill).

**Before:** bilateral contributor drafts become pending requests when the SP approves the review. **After:** drafts on the new lifecycle are released by `PSR-R-12` at accept or save. At approval, the system MUST release any contributor draft still at status 4 through the same idempotent release (owner filled, status 1, today's emails). It MUST NOT create duplicate contributor requests for contributors already released. This keeps API-ingest results and results that predate this feature working as they do today.

### 6.5 Center awareness

#### Requirement `PSR-R-14`: Informative notifications to the Creating Center

The Creating Center's users MUST receive one informative notification when a primary request is **accepted**, **declined** (sent back) or **auto-moved** to another SP. It has no buttons and counts under **For your information**.

#### Requirement `PSR-R-15`: On-hold and sent-back state on the result

On the Center's result screens (Project Information card), the system MUST show:
- **on hold:** "Awaiting {SP code} acceptance as primary Science Program";
- **sent back:** "Declined by {SP code}. Pick another primary Science Program", with the picker enabled.

Submit for review MUST stay unavailable while the result has no primary SP (existing guard).

### 6.6 Should / May

- **`PSR-R-16` (SHOULD)** Results on hold at phase rollover SHOULD be skipped from replication and logged (never crash the rollover).
- **`PSR-R-17` (MAY)** The Center's result list MAY show an "Awaiting acceptance" marker.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security** | Accept/Decline authorized server-side (`PSR-R-8`); JWT via `auth` header; no tokens or PII in logs |
| **Reliability** | Result creation, primary change and contributor save never fail because a request/notification step failed (logged, not thrown) |
| **Consistency** | Accept and the decline cascade are one transaction each; concurrent accept/decline on the same request results in exactly one outcome |
| **Backwards compatibility** | Existing `share_result_request` rows keep their behavior (`contribution` kind by default). Results with a primary SP today are untouched. Migration has a working `down` |
| **Performance** | Inbox request query stays within today's latency (no N+1 per row) |
| **i18n** | All new copy in `src/app/internationalization/` |
| **Accessibility** | New buttons and rows follow the `inbox-revamp` row a11y pattern (`role="button"`, labelled actions) |

---

## 8. Defect Classes → Gate

| Defect class this spec can produce | Caught by |
|---|---|
| Owner row written on create (result counts as SP's too early) | Server Jest on each creation path: assert no role-1 row + one pending primary request |
| Crash on ownerless result (ToC mapping, contributor save, contribution email, versioning) | Server Jest regression per guarded path (`design.md` risk list) |
| Wrong decline cascade (2 vs >2 alignments, both-decline) | Server Jest table-driven over alignment counts |
| Duplicate primary / duplicate contributor requests (double accept, re-save, review approval) | Server Jest idempotency tests |
| Unauthorized accept/decline | Server Jest on the authorization check (other-SP user, platform admin) |
| Wrong recipients (admins missing, emitter included) | Server Jest on the recipient query |
| Row wording / chip / buttons wrong, non-bilateral rows regressed | Client Jest on `notification-item` (sentence parts, labels) incl. W1/W2 regression |
| Row visual fidelity vs mockups (icon, colors, spacing) | **No automated check.** Substitute: human visual check at the HITL pause after the client row task (T6 visual review if available) |
| Migration drift | `npm run migration:check` |
| Real end-to-end flow on staging (roles, real CLARISA mappings) | **No automated check.** Manual QA on staging, recorded in `tasks.md` rollout |

---

## 9. Dependencies & Assumptions

- **Upstream:** CLARISA project mappings (`clarisa_project_mappings`, allocation > 0, status Confirmed) define SP alignments; `role_by_user` defines SP members and platform admins.
- **Downstream:** SP lists, counts, review queue and reports all key on the primary row. They exclude on-hold results by construction and need no change (to be verified in design).
- **Assumptions (proposal defaults, adopted):** OQ-1 (single SP decline → sent back), OQ-2 (both decline → sent back), OQ-3 (Center notified), OQ-4 (auto-moved SP leaves the contributor list), OQ-5 (change while pending cancels + recreates), OQ-6 (API ingest out of scope), OQ-7 (skip on-hold results at rollover), OQ-8 (no decline reason), OQ-9 (non-bilateral wording unchanged), OQ-10 (contributor request goes to the contributor SP's users + admins).

---

## 10. Open Questions

| ID | Question | Status |
|---|---|---|
| `PSR-OQ-1` | Can a platform admin accept a **contributor** request too, or only primary requests? | Default: yes, both (admins already see every request today) |
| `PSR-OQ-2` | On a 2-alignment project, when the request auto-moves to SP12, is SP12's request worded the same (Center "has tagged SP12…")? | Default: yes, same sentence with SP12 |

---

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `PSR-R-1` | Create result sends a primary request | MUST |
| `PSR-R-2` | Change primary while pending / sent back | MUST |
| `PSR-R-3` | Only SP alignments can be requested | MUST |
| `PSR-R-4` | Accept as primary | MUST |
| `PSR-R-5` | Decline, 2 alignments → other SP | MUST |
| `PSR-R-6` | Decline, >2 alignments → sent back | MUST |
| `PSR-R-7` | Sent back | MUST |
| `PSR-R-8` | Who can act | MUST |
| `PSR-R-9` | Primary request row | MUST |
| `PSR-R-10` | Contributor request row (bilateral) | MUST |
| `PSR-R-11` | Detail panel | MUST |
| `PSR-R-12` | Contributors wait for the primary | MUST |
| `PSR-R-13` | Review approval releases remaining drafts idempotently (amended) | MUST |
| `PSR-R-14` | Center informative notifications | MUST |
| `PSR-R-15` | On-hold / sent-back state for the Center | MUST |
| `PSR-R-16` | Skip on-hold results at rollover | SHOULD |
| `PSR-R-17` | "Awaiting acceptance" marker in Center list | MAY |
| `PSR-US-1..4` | User stories | — |
