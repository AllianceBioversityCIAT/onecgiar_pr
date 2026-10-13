# Requirements — Primary SP card only after Submit for review (regression)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `notifications` (received inbox) · `bilateral` (submit for review) |
| Spec Path | `bugfix/primary-notify-on-submit-regression` |
| Depth | Lite · **Bug Mode** |
| Type | Bug |
| Approval Mode | gated |
| Status | approved |
| Source | `proposal.md` (Bug Diagnosis, Option A) |
| Restores | `PNS-R-1` (`notifications/primary-notify-on-submit`), `PRA-R-1`/`PRA-R-3` timing (`notifications/primary-review-not-accept`) |
| Preserves | 2026-10-07 product decision (`1b97a9385`): the SP owns the result and its default ToC shows from the first pick |
| Requirement prefix | `PNR` |

## 2. Executive Summary

A primary Science Program must see its primary card in **Notifications → Received** only once the Center has submitted the result for review. While the result is still being prepared (Editing, AI Draft, or being corrected after a rejection), the card stays hidden. When the Center submits, the card shows as new.

## 3. Glossary

| Term | Meaning |
|---|---|
| Primary card | Received-inbox row for a `primary` request: "{Center} has tagged {SP} as the primary Science Program of result {code} …", chip "Needs your review" |
| Preparation statuses | Result statuses where the Center is still working: Editing (1), Rejected (7, under correction), Draft (8) |
| Submit | Center action **Submit for review** (first submit or resubmit after rejection) → Pending Review (5) |

## 4. System Context & Scope

**In scope:** visibility of the primary card in the Received inbox (all tabs, all pages); the card's position at the moment of Submit.

**Out of scope:** the "Bilateral Result Submitted" notification (already correct); contributor request cards; the bell pop-up (reads pending rows only); ownership/ToC writes at first pick; SP access to Editing results on other screens (proposal OQ-3); **legacy pending (not yet accepted) primary requests created before 2026-10-07** — no new ones are created, and `PRA-R-3` deliberately keeps them actionable while Editing (design `PNR-DD-1`).

## 5. Stakeholders / Personas

| Persona | Change |
|---|---|
| SP member / SP admin | No premature primary card; the card appears at Submit |
| Platform admin (role 1) | Same rule in the unscoped inbox |
| Center reporter | None visible |

## 6. Functional Requirements

### Requirement `PNR-R-1`: No primary card while the result is in preparation (MUST)

The Received inbox MUST NOT list a primary card for a result whose status is a preparation status.

#### Scenario: Center creates a result with a primary SP (the reported failure)
- GIVEN an IITA user creates a bilateral result with SP02 as primary and does not submit it
- WHEN an SP02 member opens Notifications → Received (All, Needs your decision, For your information)
- THEN no primary card for that result is listed
- BUT it must NOT remove SP02 as owner or its default ToC linkage in Section 0
- AND IT MUST behave the same for a platform admin's unscoped inbox

#### Scenario: Center changes the primary SP while Editing
- GIVEN an Editing result owned by SP02
- WHEN the Center switches the primary to SP09 and saves
- THEN neither SP02 nor SP09 sees a primary card for that result

#### Scenario: Correction after rejection
- GIVEN a result Rejected (7) by SP02 that the Center is correcting
- WHEN SP02 or a newly chosen SP opens Received
- THEN no primary card for that result is listed until it is resubmitted

#### Scenario: AI Draft promoted
- GIVEN a result in Draft (8) with a chosen primary SP
- THEN no primary card for it is listed

#### Scenario: Existing production rows
- GIVEN a result created before this fix, still Editing, with an existing accepted primary row
- WHEN the SP opens Received after this fix is deployed
- THEN no primary card is listed
- AND IT MUST NOT need a data script

### Requirement `PNR-R-2`: Primary card appears at Submit, as new (MUST)

When the Center submits (or resubmits) the result for review, the primary card MUST appear in the owning SP's Received inbox, sorted with the newest items ("Today").

#### Scenario: First submit
- GIVEN an Editing result owned by SP02, created 3 days ago
- WHEN the Center presses Submit for review
- THEN SP02's Received inbox lists the primary card under "Today"
- AND the existing "Bilateral Result Submitted" notification still fires once

#### Scenario: Resubmit after rejection
- GIVEN a Rejected result being corrected
- WHEN the Center resubmits
- THEN the owning SP's primary card is listed again under "Today"

#### Scenario: Submit fails
- GIVEN the submit transaction fails after the card update
- THEN the result stays in its previous status AND the card keeps its previous date (nothing partial)

### Requirement `PNR-R-3`: Everything else unchanged (MUST)

- Contribution and map-to-ToC cards MUST keep their current visibility in every status.
- Primary cards for results in Pending Review (5), Approved (6), Quality Assessed, Submitted or Discontinued MUST stay listed exactly as today (history kept).
- Paging of the history list MUST stay correct: no duplicated and no skipped cards across pages.

#### Scenario: Contribution card on an Editing result
- GIVEN a contribution request to SP12 on an Editing result
- THEN SP12 still sees the contribution card as today

#### Scenario: Approved result
- GIVEN a result approved by SP02
- THEN SP02's primary card is listed as today

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| `PNR-NFR-1` | Atomicity — the card date update belongs to the Submit transaction (`PNR-R-2` "Submit fails") |
| `PNR-NFR-2` | Performance — inbox load time not measurably worse; no extra query per row |
| `PNR-NFR-3` | Logs carry ids only (`.cursorrules`) |

### Defect classes → gate

| Defect class | Caught by |
|---|---|
| Primary card still listed for Editing/Draft/Rejected (the bug) | Server Jest regression test on the inbox where-builder + query result — red on current code |
| Over-filtering: contribution or post-submit primary cards disappear | Same Jest suite, positive cases (`PNR-R-3`) |
| Admin (role 1) branch missed | Jest case for role 1 |
| Card not refreshed / not atomic at Submit | Jest on `submitForReview` (date written with the transaction manager; rollback case) |
| Paging duplicates/skips after date refresh | Jest on the keyset cursor path — **partial**: mock-level only; a real-DB ordering check is a manual HITL step on PRTest |
| Real prod rows hidden without migration | **No automated check** — manual HITL on PRTest/prod-like data (open a known Editing result as its SP) |

## 8. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| `PNR-R-1` | No primary card while in preparation | MUST |
| `PNR-R-2` | Primary card appears at Submit, as new | MUST |
| `PNR-R-3` | Everything else unchanged | MUST |
| `PNR-NFR-1..3` | Atomicity, performance, logs | MUST |

**Decision taken here (proposal OQ-1/OQ-2):** Rejected (7) is a preparation status (card hidden during correction, shown again at resubmit) and resubmit refreshes the date. Overrule at this gate if product wants otherwise.
