# Primary SP Decline Rejects the Result — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| **Module / feature** | `notifications` / `primary-decline-rejects-result` |
| **Requirement prefix** | `PDR` |
| **Type** | Change (replaces part of `notifications/bilateral-primary-sp-request`) |
| **Depth** | Standard (server + client, no migration, one existing transaction rewritten) |
| **Approval Mode** | gated (inherited from `proposal.md`) |
| **Owner** | Santiago Sanchez |
| **Status** | approved (Santiago Sanchez, 2026-10-01) |
| **Date** | 2026-10-01 |
| **Linked** | `proposal.md` (approved 2026-10-01) |
| **Baseline cited** | `docs/prd.md` US-Q3 (a reject is recorded in review history), AC-3 (server-side authorization) · `docs/trd/trd.md` `results` (`result`, `result_review_history`, `share_result_request`), `Notification` |
| **Related specs** | `notifications/bilateral-primary-sp-request` (parent: PSR-R-5/6/7/14/15 changed here) · `notifications/bilateral-review-decision` (the W3/Bilateral reject this mirrors) |
| **Discovery at specify (2026-10-01)** | The proposal's OQ-1 default ("the Center can edit the rejected result and pick another primary") assumed something false: a Rejected (7) bilateral result is **read-only** for the Center today (client `isEditableByCenterUser`, server `updatePrimaryAssignment` admit only Editing/Draft). **User decision, 2026-10-01: "Final, like a reject".** A primary-declined result behaves like a review-rejected one, and no new reopen path is added |

---

## 2. Executive Summary

When the primary Science Program declines a pending primary request, it **must write a justification**. The result then becomes **Rejected**, the request **never moves** to another SP, and **no contributing SP is notified**. The Center sees the result as Rejected in its bilateral results list, and the existing rejection-justification modal tells it the primary SP declined and why. A rejected result is final for the Center, exactly like a result rejected in the SP review.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Primary request** | A `primary`-kind request asking a SP to become the primary (owner) of a bilateral result (parent spec) |
| **Ownerless result** | A bilateral result with no active primary SP (no accepted primary request) |
| **Swap request** | A primary request on a result that **already** has a primary SP (the Center asked to change it, parent `PSR-R-2`) |
| **Primary decline** | A Recipient pressing Decline on a pending primary request |
| **Rejected** | Result status `7`, the same status an SP review reject sets |
| **Justification** | The free text the SP types when declining; required, not blank after trimming whitespace |

---

## 4. System Context & Scope

### In scope
- A justification pop-up for **primary** Decline, in the inbox row and in the detail drawer.
- Server-side validation of the justification.
- On a primary decline of an **ownerless** result: Rejected status, justification recorded in review history, no auto-move, contributor requests dropped.
- The Center notice and the Center's view of the rejected result.
- Removing the "sent back / pick another primary" outcome for new declines.

### Out of scope
- Contributor request Decline (keeps today's yes/no confirmation, no justification).
- The SP review approve/reject of a submitted result.
- W1/W2 results, the API ingest path, email.
- A way for the Center to reopen or re-pick on a rejected result (user decision, see Document Control).
- Converting results that were sent back or auto-moved under the old rule (no backfill).

---

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| **SP member / SP admin** | Decline of a primary request asks for a required justification and rejects the result |
| **Platform admin** | Same as an SP member when declining on the SP's behalf; recorded as the author |
| **Center user** | A declined result shows Rejected with the reason; it is read-only, as any rejected result |
| **Contributing SP** | Gets nothing when the primary declines (before: could receive the auto-moved primary request) |

- **`PDR-US-1`** As an SP member, I want to explain why we decline being the primary of a result, so that the Center knows the reason. *(Refines US-Q3.)*
- **`PDR-US-2`** As a Center user, I want a result the primary SP declined to show as Rejected with the reason, so that I don't wait for a decision that already happened.
- **`PDR-US-3`** As a contributing SP, I don't want requests for a result whose primary SP declined it.

---

## 6. Functional Requirements

### 6.1 Justification

#### Requirement `PDR-R-1`: Decline of a primary request asks for a justification

When a Recipient presses **Decline** on a pending primary request (inbox row or detail drawer), the system MUST open a pop-up with the same layout and behavior as the W3/Bilateral "Reject result" pop-up: a reject-styled icon and title, a short message, a required **Justification** textarea, and **Cancel** / **Confirm** buttons.

##### Scenario: SP09 opens the decline pop-up
- GIVEN a pending primary request to SP09 for result 9391
- WHEN a SP09 member presses **Decline**
- THEN a pop-up opens titled **"DECLINE PRIMARY ROLE – 9391"**
- AND it shows the message *"Please explain why SP09 declines to be the primary Science Program of this result."*
- AND the **Justification** field is marked required and starts empty
- AND **Confirm** is disabled
- BUT the request MUST NOT be sent until Confirm is pressed

##### Scenario: blank text
- GIVEN the pop-up is open
- WHEN the field is empty or holds only spaces or line breaks
- THEN **Confirm** stays disabled

##### Scenario: cancel
- GIVEN the pop-up is open with text typed
- WHEN the user presses **Cancel**, the close icon, Escape or the mask
- THEN the pop-up closes and nothing is sent
- AND the request is still pending with its Accept as primary / Decline buttons
- AND reopening the pop-up shows an empty field

##### Scenario: saving
- GIVEN the user pressed **Confirm**
- WHILE the decline is in flight
- THEN **Confirm** and **Cancel** are disabled and Confirm shows a spinner
- AND IT MUST NOT send a second decline on a double click

##### Scenario: server error
- GIVEN the user pressed **Confirm**
- WHEN the server answers with an error (403, 409, 500)
- THEN the pop-up closes and the existing error toast and handling for the decision is shown (409 = already answered)
- BUT a 400 for a blank justification MUST leave the pop-up open with the text kept, and show the error

#### Requirement `PDR-R-2`: Contributor Decline is unchanged

The Decline of a **contribution** request (W1/W2 or bilateral contributor) MUST keep today's yes/no confirmation with no justification field.

##### Scenario: SP12 declines a contributor request
- GIVEN a pending bilateral contributor request to SP12
- WHEN a SP12 member presses **Decline**
- THEN today's "DECLINE CONTRIBUTION / Are you sure…" confirmation opens
- BUT it MUST NOT show a justification field or require text

#### Requirement `PDR-R-3`: The server requires the justification

The server MUST reject a primary decline whose justification is missing or blank after trimming, with **400** and the message *"Justification is required when declining a primary request"*, and MUST change nothing. A justification on an **accept** or on a contribution decision MUST be ignored (not stored, no error).

##### Scenario: API call without text
- GIVEN a pending primary request
- WHEN the decision endpoint is called with status Declined and no justification (or `"   "`)
- THEN the answer is 400
- AND the request is still pending, the result status is unchanged, and nothing is written to review history

### 6.2 Outcome of a decline

#### Requirement `PDR-R-4`: Declining an ownerless result rejects it

When a Recipient declines a pending primary request with a valid justification and the result is **ownerless**, the system MUST, as one atomic change:
1. mark the request Declined;
2. set the result's status to **Rejected (7)**, recording who and when;
3. add one review-history entry with action **REJECTED** and the comment *"{SP code} declined to be the primary Science Program of this result: {justification}"* (justification trimmed), authored by the declining user;
4. drop every pending or draft **contribution** request of the result.

##### Scenario: SP09 declines on a 2-SP project (B-A1634: SP09 70% / SP12 30%)
- GIVEN result 9391 is ownerless, has a pending primary request to SP09, and the Center saved SP12 as a contributor
- WHEN a SP09 member declines with *"This work is outside our portfolio"*
- THEN the SP09 request is Declined
- AND result 9391 is **Rejected**
- AND its review history has one REJECTED entry: *"SP09 declined to be the primary Science Program of this result: This work is outside our portfolio"*, by that member
- AND SP12's contributor draft is dropped
- BUT no new primary request to SP12 MUST be created

##### Scenario: any number of alignments
- GIVEN the lead project has **1**, **2**, **3** or more SP alignments
- WHEN the primary declines
- THEN the outcome is the same as above, every time

##### Scenario: atomic
- GIVEN any of the four writes fails
- THEN none of them persists, and the request stays pending
- AND IT MUST be safe against a race: two declines, or an accept racing a decline, on the same request end with exactly one outcome; the loser gets 409 and writes nothing

#### Requirement `PDR-R-5`: No auto-move, ever (removes `PSR-R-5`, `PSR-R-6`)

A primary decline MUST NOT create a primary request to any other SP, whatever the number of alignments. The rules "exactly two alignments → move to the other SP" (`PSR-R-5`) and "more than two → send back" (`PSR-R-6`) are **removed**.

#### Requirement `PDR-R-6`: Contributing SPs are not notified

After a primary decline, no contributing SP MUST receive a request, an inbox notice or an email for that result. A contributor already tagged by the Center sees nothing.

##### Scenario: SP12 tagged as contributor
- GIVEN SP12 was saved as a contributor of result 9391 and SP09 declines the primary request
- THEN SP12's inbox has no new row for result 9391
- AND IT MUST stay that way if SP09's members later reload or act on the declined row

#### Requirement `PDR-R-7`: Swap decline does not reject (unchanged parent behavior + justification)

When the declined request is a **swap request** (the result already has a primary SP), the system MUST keep today's outcome: the current primary SP stays, the result's status does not change, and no other request is created. The justification is still required (`PDR-R-1`, `PDR-R-3`) and reaches the Center through the notice (`PDR-R-10`). No review-history entry is written, because the result was not rejected.

##### Scenario: SP12 declines taking over from SP09
- GIVEN SP09 is the primary of result 9385 (Editing) and the Center asked SP12 to take over
- WHEN SP12 declines with a justification
- THEN SP09 is still the primary and result 9385 is still in Editing
- BUT result 9385 MUST NOT be Rejected

### 6.3 What the Center sees

#### Requirement `PDR-R-8`: Rejected in the Center's bilateral results list

A result rejected by a primary decline MUST show the **Rejected** status in the Center's bilateral results list, and the existing "View rejection justification" action MUST open the existing modal with the decliner's name, the date and the `PDR-R-4` comment.

##### Scenario: Center opens the reason
- GIVEN result 9391 was rejected by SP09's decline
- WHEN a Center user opens the rejection justification from the list
- THEN the modal shows "Rejected by {decliner name} on {date}" and *"SP09 declined to be the primary Science Program of this result: This work is outside our portfolio"*

#### Requirement `PDR-R-9`: A primary-declined result is final for the Center

A result rejected by a primary decline MUST be read-only for the Center, exactly like a review-rejected result. The Project Information card MUST NOT offer to pick another primary, and the server MUST keep refusing a primary change on it.

##### Scenario: Center tries to re-pick
- GIVEN result 9391 is Rejected after SP09's decline
- WHEN a Center user opens the result
- THEN the form is read-only and no "Pick another primary Science Program" hint is shown
- AND a direct call to change the primary assignment gets today's 400 ("…can only be changed while the result is in Editing or Draft.")

#### Requirement `PDR-R-10`: Center notice (modifies `PSR-R-14`)

On a primary decline, the Creating Center's users MUST receive exactly one informative notice (existing "declined" type):
- ownerless result: *"{SP code} declined to be the primary Science Program of this result. The result was rejected. Reason: {justification}"*;
- swap request: *"{SP code} declined to become the primary Science Program of this result. {current primary SP code} remains the primary. Reason: {justification}"*.

The "moved" notice MUST no longer be emitted; existing "moved" rows MUST keep rendering. A failure to send the notice MUST NOT undo the decline.

#### Requirement `PDR-R-11`: The SP sees the decided row

After the decline, the declined primary request MUST stay visible to its Recipients under **For your information** as Declined, without buttons (parent `PSR-R-9`). It MUST NOT disappear from the inbox.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Consistency** | `PDR-R-4` is one transaction under the existing row lock; concurrent decisions give one outcome |
| **Security** | Recipient authorization stays server-side (parent `PSR-R-8`, AC-3). The justification is never written to logs; logs keep ids only (`.cursorrules`) |
| **Input safety** | The justification is stored as text and rendered as text (Angular interpolation, no `innerHTML`) |
| **Backwards compatibility** | The decision endpoint gains one optional field; existing callers (accept, contribution decisions) are unaffected. No bilateral payload change |
| **Accessibility** | The pop-up reuses the W3 reject dialog: labelled textarea, required marker, Escape closes, focus stays in the dialog |
| **Internationalization** | New strings go in `src/app/internationalization/` copy files |

---

## 8. Defect Classes And Their Gates

| Defect class this spec can produce | What catches it |
|---|---|
| Decline still auto-moves to another SP (old branch survives) | Server Jest on `PrimaryProgramRequestService.decline`, table-driven over 1/2/3 alignments: asserts no new primary row and Rejected status. **Fails** if any alignment count creates a request |
| Result rejected but history/request not written (partial write) | Server Jest asserting all four writes on one transaction manager, plus a test where the history save throws and nothing else is committed |
| Blank justification accepted | Server Jest: `""`, `"   "`, missing → 400 and no writes. Client Jest: Confirm disabled for blank and whitespace-only |
| Swap decline rejects the result | Server Jest: owner exists → status unchanged, no history entry, no new request |
| Contributor Decline gets the justification pop-up (wrong branch) | Client Jest on `notification-item` / `contribution-request-drawer`: contributor Decline opens the yes/no confirmation |
| Contributor notified after a primary decline | Server Jest: contribution rows dropped, no notification or email call |
| Declined row vanishes from the SP's inbox | Server Jest: the primary row stays active with status Declined |
| Center list does not show the reason | **No automated end-to-end check** (the list reads review history through an existing endpoint). Covered by a manual check at the T-final HITL pause on the testing DB |
| Pop-up layout differs from the W3 reject pop-up | **No automated check** (jsdom cannot judge layout). Manual visual check at the HITL pause, side by side with the W3 reject pop-up |

---

## 9. Requirement ID Index

| ID | Short name | Strength |
|---|---|---|
| `PDR-R-1` | Justification pop-up on primary Decline | MUST |
| `PDR-R-2` | Contributor Decline unchanged | MUST |
| `PDR-R-3` | Server requires the justification | MUST |
| `PDR-R-4` | Ownerless decline → Rejected + history + contributors dropped | MUST |
| `PDR-R-5` | No auto-move (removes `PSR-R-5`, `PSR-R-6`) | MUST |
| `PDR-R-6` | Contributing SPs not notified | MUST |
| `PDR-R-7` | Swap decline keeps the owner, records the reason | MUST |
| `PDR-R-8` | Rejected + reason in the Center list | MUST |
| `PDR-R-9` | Final for the Center (replaces `PSR-R-7` sent back, the sent-back part of `PSR-R-15`) | MUST |
| `PDR-R-10` | Center notice text; "moved" no longer emitted (modifies `PSR-R-14`) | MUST |
| `PDR-R-11` | Declined row stays in the SP's inbox | MUST |

**Parent spec delta:** `PSR-R-5`, `PSR-R-6` removed · `PSR-R-7` replaced by `PDR-R-9` · `PSR-R-14`, `PSR-R-15` modified · parent OQ-8 ("no decline reason") reversed.
