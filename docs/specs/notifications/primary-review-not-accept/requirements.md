# Primary SP Reviews the Result (no "Accept as primary") — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| **Module / feature** | `notifications` / `primary-review-not-accept` |
| **Requirement prefix** | `PRA` |
| **Type** | Change. Supersedes, for new submits and swaps, `PSR-R-1` / `PSR-R-2` / `PSR-R-4` (`bilateral-primary-sp-request`) and `PNS-R-2` / `PNS-R-3` / `PNS-R-5` (`primary-notify-on-submit`) |
| **Depth** | Standard (small code, but it reverses shipped rules on a prod-critical path) |
| **Approval Mode** | gated |
| **Owner** | Santiago Sanchez |
| **Status** | approved (Santiago Sanchez, 2026-10-07) |
| **Date** | 2026-10-07 |
| **Source** | `proposal.md` (approved 2026-10-07); meeting summary with Angel |
| **Baseline cited** | `docs/prd.md` US-S3, US-Q3 · `docs/trd/trd.md` `results` (`share_result_request`, `results_by_inititiatives`), `Notification` |
| **Related specs** | `notifications/bilateral-primary-sp-request` (PSR) · `notifications/primary-notify-on-submit` (PNS) · `notifications/primary-decline-rejects-result` (PDR) · `bilateral/rejected-result-correction` (RRC, owns `transferPrimary`) |

---

## 2. Executive Summary

The primary Science Program does **not** accept its role. When the Center submits, the chosen SP **is** the primary and the result lands in its review queue. The SP **approves or rejects the result** in the review drawer (reject needs a justification). Approving releases the contributor requests (already works).

Old pending "Accept as primary" requests (2 in prod, both on Editing results) are resolved by the same code: the Center can submit them, and the SP's inbox button becomes **"Review result"**.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Owner** | The primary SP: `results_by_inititiatives` role 1 |
| **Saved choice** | The SP the Center picked while the result has no owner: a DRAFT primary row (PNS) |
| **Legacy pending request** | An active PENDING primary row created before PNS shipped (prod: requests 4545, 4546) |
| **Swap** | The Center picks a different primary SP on a result that already has an owner |
| **Review drawer** | The SP's bilateral review panel (`entity-details/:sp/bilateral-review?reviewResult=…`) with Approve / Reject |

## 4. Scope

**In:** Submit for review of an ownerless bilateral result; primary swap while Editing/Draft; the inbox row, its drawer and the bell card for primary requests; the Center's primary banner copy.

**Out:** the review drawer and its approve/reject logic; contributor release (unchanged); Rejected → resubmit (RRC, unchanged); API ingest; email; removal of the primary-request tables/enums/services; a DB script.

## 5. Personas

| Persona | Change |
|---|---|
| Center user | Submit always works with a picked SP; the banner says the SP will review the result |
| SP member / SP admin / platform admin | The result shows up in the SP's review queue at submit; the inbox action is "Review result" |
| Contributor SP | No change: request (Accept/Decline) arrives when the primary approves |

## 6. Functional Requirements

### Requirement `PRA-R-1`: Submit makes the chosen SP the owner

When the Center submits a result that has **no owner** and has a saved choice **or** a legacy pending request, the system MUST, in the same transaction as the status change, make that SP the owner and close every active primary request row of the result.

#### Scenario: submit with a saved choice
- GIVEN a result in Editing, no owner, SP01 saved as the choice, SP02 saved as contributor, quality assessment done
- WHEN the Center presses **Submit for review**
- THEN the result is **Pending Review** and SP01 is the owner
- AND the result appears in SP01's bilateral review list and counts
- AND SP01's members receive the "submitted for your review" notification
- BUT SP01 MUST NOT receive any "Accept as primary" request
- AND IT MUST NOT create SP02's actionable contributor request at this moment (it comes with approval, `PRA-R-4`)

#### Scenario: submit with a legacy pending request (prod 9737 / 9738)
- GIVEN a result in Editing, no owner, an active PENDING primary row to SP X
- WHEN the Center submits
- THEN the submit succeeds, SP X is the owner, the result is Pending Review
- AND the PENDING row is no longer active (the SP's inbox no longer offers a decision on it)
- BUT IT MUST NOT be refused with "A new primary Science Program request is pending…"

#### Scenario: no owner and no choice
- GIVEN a result with no owner and no saved choice or pending request
- WHEN the Center submits
- THEN today's refusal stays: "The result has no Science Program assigned…" and nothing changes

#### Scenario: owner-making step fails
- GIVEN writing the owner fails
- WHEN the Center submits
- THEN the whole submit MUST fail and the result MUST stay in its previous status

#### Scenario: submit with an owner (unchanged)
- GIVEN a result that already has an owner
- WHEN the Center submits
- THEN today's behavior is unchanged

### Requirement `PRA-R-2`: A primary swap is a direct owner change

When the Center picks a different primary SP on an Editing/Draft result that already has an owner, the system MUST make the new SP the owner at once, with no request.

#### Scenario: swap SP01 → SP03 while editing
- GIVEN an Editing result owned by SP01
- WHEN the Center picks SP03 and saves the Project Information card
- THEN SP03 is the owner and SP01 is not
- AND no primary request is sent to anyone
- AND Submit for review is allowed right after
- BUT IT MUST still refuse an SP that is not an alignment of the lead project (same message as today)

#### Scenario: first pick with no owner (unchanged)
- GIVEN an Editing result with no owner
- WHEN the Center picks SP01 and saves
- THEN SP01 is saved as the choice (no owner yet, no request) — PNS-R-1 unchanged

### Requirement `PRA-R-3`: The primary request row becomes "Review result"

For a primary request row (inbox row, its drawer, bell card), the system MUST show one action **"Review result"** and a chip **"Needs your review"**, and MUST NOT show Decline.

#### Scenario: SP clicks "Review result" on a result in Pending Review
- GIVEN a legacy pending request on a result in Pending Review
- WHEN an SP member clicks **Review result**
- THEN the SP becomes the owner (existing accept) in one click, with no confirm step
- AND the app opens that result's review drawer in the SP's bilateral review page

#### Scenario: SP clicks "Review result" while the result is still Editing
- GIVEN a legacy pending request on a result in Editing (prod 9737 / 9738)
- WHEN an SP member clicks **Review result**
- THEN the SP becomes the owner
- AND the app shows: "You are now the primary Science Program. You will be notified when the Center submits it for review."
- BUT IT MUST NOT navigate to a review drawer that cannot show the result

#### Scenario: the request was already closed
- GIVEN the Center already submitted (the row was closed by `PRA-R-1`)
- WHEN the SP clicks **Review result** on a stale row
- THEN the app opens the review drawer anyway (the SP is already owner); the "already answered" conflict MUST NOT be shown as an error

#### Scenario: no Decline on primary rows
- GIVEN any primary request row
- THEN no Decline button or decline-justification dialog is offered
- AND contributor request rows keep Accept / Decline unchanged

### Requirement `PRA-R-4`: Approve / reject happens in the review drawer (unchanged, pinned)

#### Scenario: SP01 approves
- GIVEN a Pending Review result owned by SP01 with SP02 as saved contributor
- WHEN SP01 approves in the review drawer
- THEN SP02 receives its contributor request (Accept / Decline)

#### Scenario: SP01 rejects
- WHEN SP01 rejects with a blank justification → blocked
- WHEN SP01 rejects with a justification → the result is Rejected with that justification

### Requirement `PRA-R-5`: Center banner wording

The Center's Project Information banner MUST describe review, not acceptance.

| State | Text |
|---|---|
| Saved choice (draft) or legacy pending, no owner | "{SP} will review this result when you submit it for review" (info) |
| Submit-blocked note | not shown for these two states |

- BUT the Rejected / sent-back / unpicked banners (PDR, PSR) MUST stay unchanged.

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Atomicity | `PRA-R-1` owner write, row closing and status change are one transaction |
| Security | Logs carry ids only (`.cursorrules`) |
| Compatibility | No migration. Existing owned results, contributor rows and rejected results are untouched |
| Deploy | Server and client can ship in the same release; server alone already unblocks the 2 prod results |

## 8. Defect classes → gate

| Defect class | Gate |
|---|---|
| Ownerless submit with pending row still refused | Server Jest: `bilateral-center.service.spec.ts` (new case for legacy pending) |
| Owner not written / pending row left active / notification not sent | Server Jest: `submitForReview` cases asserting `transferPrimary` + `announcePendingReview` calls |
| Swap still sends a request | Server Jest: `updatePrimaryAssignment` swap case asserts `transferPrimary`, not `request` |
| Wrong label / Decline still visible / confirm step still present | Client Jest: `request-decision.spec.ts`, `notification-item.component.spec.ts`, `pop-up-notification-item.component.spec.ts` |
| Wrong navigation target | Client Jest asserting the URL from `buildReviewDrawerRoute` vs the Editing message |
| Real end-to-end flow (submit → SP list → approve → SP02 request) | **No automated gate.** Manual check on PRTest before prod (HITL), then the 2 prod results after deploy |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `PRA-R-1` | Submit makes the chosen SP the owner | MUST |
| `PRA-R-2` | Primary swap is a direct owner change | MUST |
| `PRA-R-3` | Primary request row becomes "Review result" | MUST |
| `PRA-R-4` | Approve / reject in the review drawer (pinned) | MUST |
| `PRA-R-5` | Center banner wording | MUST |
