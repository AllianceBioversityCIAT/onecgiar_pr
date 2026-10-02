# Primary SP Request Sent on Submit for Review — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| **Module / feature** | `notifications` / `primary-notify-on-submit` |
| **Requirement prefix** | `PNS` |
| **Type** | Change. It replaces the timing in `PSR-R-1` and the owner guard in `PSR-R-7` (`notifications/bilateral-primary-sp-request`) |
| **Depth** | Standard (Lite requested, raised at Step 2.4: 3 tasks, ~300 LOC, see `design.md` §9) |
| **Approval Mode** | gated |
| **Owner** | Santiago Sanchez |
| **Status** | approved (Santiago Sanchez, 2026-10-01) |
| **Date** | 2026-10-01 |
| **Source** | User request, 2026-10-01. Decisions: Submit sends the request (option 1); separate spec from `primary-decline-rejects-result` |
| **Baseline cited** | `docs/prd.md` US-S3 · `docs/trd/trd.md` `results` (`share_result_request`), `Notification` |
| **Related specs** | `notifications/bilateral-primary-sp-request` (parent, PSR) · `notifications/primary-decline-rejects-result` (PDR, shipped in `ea4411693`: it owns the decline outcome) |
| **Amended** | 2026-10-01 (Pivot Record `PNS-T-2`, approved by Santiago Sanchez): `PNS-R-4` defers to `PDR-R-4`/`PDR-R-5` |

---

## 2. Executive Summary

Today a Center that **creates** a bilateral result with a primary SP sends that SP a primary request straight away. The SP gets an inbox request for a result that the Center has not finished yet.

**After this change:** the Center's choice is **saved but not sent**. The request goes to the SP only when the Center presses **Submit for review**. Submit no longer needs an accepted owner: when there is none, Submit sends the request.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Saved primary choice** | The SP the Center picked, stored for the result. No SP user can see or act on it |
| **Pending primary request** | The actionable inbox request that today exists from the moment of creation (`PSR-R-9`) |
| **Owner** | The accepted primary SP (`results_by_inititiatives` role 1) |

## 4. Scope

**In:** bilateral results created by a Center (AI draft **Create result**, manual create) and the first pick on the Project Information card while the result has **no owner** and is not yet submitted.

**Out:**
- **Swap** (the result already has an owner and the Center picks another SP): unchanged. The request is sent immediately and Submit stays blocked while it is pending (`PSR-R-2`).
- API ingest (`PSR` OQ-6).
- The decline **outcome**. `primary-decline-rejects-result` (`PDR-R-4`, `PDR-R-5`) owns it: an ownerless decline sets Rejected, with no auto-move, whether or not the result was submitted. `PNS-R-4` only pins that this also holds after submit.
- Email: no new mail.

## 5. Personas

| Persona | Change |
|---|---|
| Center user | Picks the primary SP while editing. Sees "will be sent on submit". Can submit without waiting for acceptance |
| SP member (Recipient) | Gets the primary request only after the Center submits |

## 6. Functional Requirements

### Requirement `PNS-R-1`: Creating a result does not send the primary request

When a Center creates a bilateral result with a chosen primary SP, the system MUST save the choice and MUST NOT send a pending primary request.

#### Scenario: AI draft promoted with SP09 chosen
- GIVEN project B-A1634 with alignments SP09 and SP12
- WHEN the Center presses **Create result** with SP09 as primary
- THEN the result exists with no owner and SP09 saved as the primary choice
- BUT SP09's Recipients MUST NOT see any request for that result in their inbox
- AND IT MUST still reject a SP that is not an alignment of the lead project (`PSR-R-3`, same message)

#### Scenario: manual create
- GIVEN the manual form with SP09 as primary
- WHEN the result is created
- THEN the behavior is the same as the AI-draft scenario

#### Scenario: Center changes the choice before submitting
- GIVEN a result with no owner and SP09 saved as the primary choice
- WHEN the Center picks SP12 on the Project Information card and saves
- THEN SP12 is the saved choice and SP09 is not
- AND no SP receives a request
- BUT re-saving the same SP MUST NOT create a second saved choice

### Requirement `PNS-R-2`: Submit for review sends the primary request

When a Center submits a result that has **no owner** and has a saved primary choice, the system MUST move the result to **Pending Review** and, in the same step, turn the saved choice into a pending primary request to that SP.

#### Scenario: submit with SP09 saved
- GIVEN a result in Editing or Draft, no owner, SP09 saved, quality assessment done
- WHEN the Center presses **Submit for review**
- THEN the result status is Pending Review
- AND SP09's Recipients see the pending primary request in their inbox (`PSR-R-9` row, unchanged)
- BUT the result MUST NOT appear in any SP09 list, count or review queue until SP09 accepts (`PSR-R-1` rule kept)
- AND IT MUST NOT send the "result submitted" or contributor-tagging notifications at this moment (no owner yet; see `PNS-R-3`)
- AND IT MUST refuse any review decision (approve/reject) on that result until the primary accepts, with "This result is awaiting the primary Science Program's acceptance." (a platform admin can open it even though SP lists hide it)

#### Scenario: submit with no owner and no saved choice
- GIVEN a result with no owner and no saved primary choice (never picked)
- WHEN the Center presses **Submit for review**
- THEN the request is refused with today's message "The result has no Science Program assigned…"
- AND nothing changes

#### Scenario: submit with an owner (existing behavior)
- GIVEN a result with an accepted owner and no pending swap
- WHEN the Center submits
- THEN today's behavior is unchanged (status Pending Review, submitted notice, contributor tagging)

#### Scenario: the request step fails
- GIVEN turning the saved choice into a pending request fails
- WHEN the Center submits
- THEN the whole submit MUST fail and the result MUST stay in Editing/Draft, so no result sits in Pending Review with nobody asked

### Requirement `PNS-R-3`: Accepting a submitted result puts it in the SP's review queue

When the SP accepts the primary request of a result that is already in Pending Review, the system MUST make it the owner (`PSR-R-4`, unchanged) and then send the notifications that a normal submit sends.

#### Scenario: SP09 accepts
- GIVEN a result in Pending Review, no owner, pending primary request to SP09
- WHEN a SP09 member accepts
- THEN SP09 is the owner and the result is in SP09's review queue as Pending Review
- AND SP09's members receive the "result submitted" notification, and tagged contributors are handled exactly as a normal submit does
- AND the Creating Center receives the "accepted" notice (`PSR-R-14`)
- BUT contributor requests MUST NOT be created twice (the release at accept and the tagging at submit stay idempotent)

### Requirement `PNS-R-4`: Declining a submitted result follows PDR

> **Amended 2026-10-01** (Pivot Record `PNS-T-2`). It used to say "returns it to Editing, auto-move kept". `PDR-R-4`/`PDR-R-5` (shipped) replace that.

When the primary request of a result in Pending Review with no owner is declined, the system MUST apply `PDR-R-4` exactly as it does for an unsubmitted result. The result becomes **Rejected**, and no primary request goes to any other SP (`PDR-R-5`). PNS adds no decline rule of its own.

#### Scenario: decline after submit
- GIVEN a result in Pending Review, no owner, pending primary request to SP09 (any number of alignments)
- WHEN SP09 declines with a justification
- THEN the result is **Rejected** (not left in Pending Review, not Editing)
- AND no new primary request is created

### Requirement `PNS-R-5`: The Center sees that the request goes out on submit

On the Project Information card, while a primary choice is saved and not yet sent, the system MUST show the info banner "{SP code} will be asked to be the primary Science Program when you submit for review", MUST keep the picker enabled, and MUST NOT show the "Submit blocked" reason.

#### Scenario: banner after create
- GIVEN a result just created with SP09 saved
- WHEN the Center opens it
- THEN the banner reads "SP09 will be asked to be the primary Science Program when you submit for review"
- AND Submit for review is enabled (once the other checks pass)
- AND after submit the banner reads today's "Awaiting SP09 acceptance as primary Science Program"

## 7. Non-Functional Requirements

| Attribute | Requirement |
|---|---|
| Reliability | Create and Project Information save never fail because saving the choice failed (logged, not thrown, as `PSR` §7). Submit is atomic (`PNS-R-2` failure scenario) |
| Security | Logs carry ids only (`.cursorrules`) |
| Compatibility | Results already holding a pending request (created before this change) keep working: they stay pending, and Submit stays blocked for them until accepted |

## 8. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Request still sent on create | Server Jest: create paths save a non-actionable choice (`PNS-R-1`) |
| Submit refused for an ownerless result with a choice / allowed with none | Server Jest on `assertSubmittable` + `submitForReview` (`PNS-R-2`) |
| Saved choice leaks into the inbox or into the contributor-draft logic (`request_status_id = 4` is shared with contributor drafts) | Server Jest on `shareResultRequestExists` + inbox query scope. **Partial gap:** the inbox SQL is not unit-testable here; manual check at the HITL pause (SP09 inbox empty after create) |
| Submitted/tagging notices fire without an owner, or twice | Server Jest on `submitForReview` and `accept` (`PNS-R-3`) |
| Declined submitted result stuck in Pending Review | Server Jest regression on `decline` from Pending Review → Rejected (`PNS-R-4` → `PDR-R-4`) |
| Wrong banner / Submit still blocked in UI | Client Jest on `section-zero-dashboard` (`PNS-R-5`) |
| End-to-end flow (create → submit → inbox → accept → review queue) | **No automated E2E.** Manual check at the HITL pause on local |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `PNS-R-1` | Create does not send the primary request | MUST |
| `PNS-R-2` | Submit sends the primary request | MUST |
| `PNS-R-3` | Accept of a submitted result enters the review queue | MUST |
| `PNS-R-4` | Decline of a submitted result follows `PDR-R-4` (Rejected) | MUST |
| `PNS-R-5` | Center banner "sent on submit" | MUST |

## 10. Open Questions (defaults adopted unless changed)

- ~~**OQ-1** Decline after submit returns to **Editing**.~~ **Superseded** by `PDR-R-4` (Rejected), amended 2026-10-01.
- **OQ-2** Results with a request already pending at deploy time stay as they are. Default: no data backfill.
