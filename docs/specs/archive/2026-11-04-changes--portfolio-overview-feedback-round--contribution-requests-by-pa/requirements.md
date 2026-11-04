# Requirements — Contribution requests by Program/Accelerator (CRP)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Parent Spec | `changes/portfolio-overview-feedback-round` (child 3 of 3, point 6) |
| Prefix | `CRP` |
| Depth | **Standard** (one admin-only read endpoint + one read-only block; no write, no migration) |
| Type | Change |
| Approval Mode | `gated` |
| Status | approved (2026-11-04) |
| Date | 2026-11-04 |

## 2. Executive Summary

Before the reporting deadline the PMU wants to see, per Program/Accelerator (P/A), which **contribution requests** are still waiting for an answer, so they can chase the right P/A. The `/portfolio-overview` page gets a new block **Contribution requests by Program/Accelerator**: per P/A, requests **sent** and **received**, split Pending / Accepted / Declined, for the page's phase, with a list of the pending ones. Monitoring only — no reminder is sent from the screen.

**Discovery vs proposal (OQ-5):** the proposal said "received = `shared_inititiative_id`". In the code, the P/A that must **act** on a request is `approving_inititiative_id` (the Notifications "received" tab filters on it; a contributor can also ask the owner to be added, in which case the shared and approving P/A differ). This spec uses **received = the P/A that must accept or decline**.

## 3. Glossary

| Term | Meaning |
|---|---|
| Contribution request | A row of `share_result_request` with type `contribution` (not the bilateral "primary Science Program" kind) |
| Sent by P/A X | X is the requester P/A of the request |
| Received by P/A X | X is the P/A that must accept or decline it |
| Pending / Accepted / Declined | Request status 1 / 2 / 3. Status 4 (draft, never sent) is not a request yet |
| Page phase | The version the page already uses (`versionId`), open phase by default |
| Request in phase | Its result belongs to the page phase |

## 4. System Context & Scope

**In scope:** one admin-only read endpoint under `results-framework-reporting/portfolio/…`; one new block on `/portfolio-overview`; Program global filter on the block; component guide update.
**Out of scope:** sending reminders or emails; editing, accepting or declining requests from this screen; primary-SP (bilateral) requests; Center / project tagging notices; export to Excel; Results Center, Notifications page.

## 5. Personas

| Persona | Change |
|---|---|
| PMU / portfolio admin | Sees per P/A how many contribution requests are pending, and which ones, to send reminders before the deadline |

## 6. Functional Requirements

### CRP-R-1 — Counts per P/A (MUST)

The system SHALL return, for the page phase and for **every** P/A of the open portfolio (zeros included), the count of contribution requests **sent** and **received**, each split Pending / Accepted / Declined, plus portfolio totals.

#### Scenario: one request, both sides

- GIVEN in the page phase SP01 asked SP05 to contribute to result R, and SP05 has not answered
- WHEN the admin opens the block
- THEN SP01 shows Sent Pending 1 and SP05 shows Received Pending 1
- AND the portfolio total shows Pending 1 (a request counts **once** in the totals, not once per side)
- AND IT MUST list a P/A with no request with all counts 0
- BUT it must NOT count drafts (status 4), inactive requests, requests on inactive results, or `primary`-type requests

#### Scenario: phase scope

- GIVEN a pending request whose result belongs to a previous phase
- WHEN the block loads for the open phase
- THEN that request is not counted

### CRP-R-2 — Pending list (MUST, OQ-6)

The system SHALL list every pending contribution request of the phase with: result code, result title, requester P/A, P/A that must answer, request date, and days waiting. The list is ordered oldest first.

- GIVEN 3 pending requests received by SP05
- WHEN the admin expands SP05 (or the whole list)
- THEN the 3 requests appear, oldest first
- AND IT MUST let the admin open each result (link to the result page, new tab)
- BUT it must NOT list accepted or declined requests

### CRP-R-3 — Block on the page (MUST)

The page SHALL show the block **Contribution requests by Program/Accelerator** after the W3/Bilateral projects block and before the results detail list.

- GIVEN the page finished loading its phase
- WHEN it renders
- THEN the block shows its own loading, error (with Retry), empty and ready states
- AND it renders even when the phase has no result rows (own data path, like the Projects block)
- AND a failure of this block leaves the rest of the page intact
- AND IT MUST make **one** request per phase and per Retry
- BUT it must NOT show any `%` figure (parent rule, PCA-R-1)

#### Scenario: empty phase

- GIVEN no contribution request in the phase
- THEN the block says there are no contribution requests for the phase, and no table

### CRP-R-4 — Global filters (MUST)

The block SHALL honour the **Program** filter and ignore the others.

- GIVEN Program = SP05 selected
- WHEN the block renders
- THEN only the SP05 row shows, and the pending list keeps only requests where SP05 is the requester or must answer
- AND changing the filter does not call the server again
- AND when Project, Center, Typology, Status or Funding is active, the block says "Not affected by: …" like the other own-data blocks
- AND IT MUST keep the portfolio totals unfiltered and say so while the Program filter narrows the rows

### CRP-R-5 — Admin only (MUST)

The endpoint SHALL answer only to the Admin application role, like the sibling `portfolio/*` endpoints.

- GIVEN a non-admin user calls it
- THEN it is refused (same guard response as `portfolio/bilateral-projects`)

### CRP-R-6 — Sort and scan (SHOULD)

The P/A table SHOULD be ordered by received Pending, highest first, then by P/A code, so the P/As to chase are on top.

### CRP-R-7 — Guide kept true (MUST)

`portfolio-overview/CLAUDE.md` SHALL record the block (data path, mount rule, filter rule, "received = must answer").

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | One SQL query + one P/A catalogue read per call; response < 1 s on prod-size data (today's contribution requests are hundreds per phase, not thousands) |
| Security | Admin role guard; `auth` header; no user e-mails in the payload |
| Accessibility | Table with header cells and caption; expand control is a `<button aria-expanded>`; WCAG 2.1 AA |
| i18n | Copy in `internationalization/portfolio-overview.copy.ts` |
| Compatibility | No schema change, no migration; existing endpoints untouched |

## 8. Defect classes and gates

| Defect class | Gate |
|---|---|
| Wrong SQL scope (drafts, primary type, inactive, other phase, wrong side) | Server Jest asserts the query text carries each filter (presence only — **cannot prove the counts**). Behavioural substitute: **V-1** — the user runs a plain SQL count in prod, pasted inline in chat, and compares it with the endpoint for one P/A and the totals, at the HITL pause |
| Wrong mapping / totals counted twice | Server Jest on the service with a fixture (one request seen from both sides, zero-request P/A, each status) |
| Filter / states / sort wrong in the block | Client Jest on the block (Program filter, not-affected text, empty, error + Retry, one request per version) |
| `%` shown, layout broken | Jest `textContent` has no `%`; layout has **no automated check** (jsdom) → read-only browser check at the HITL pause (shared prdb: no write buttons) |
| Non-admin access | Controller Jest asserts the role metadata, same as siblings |

## 9. Requirement ID Index

| ID | Source | Strength |
|---|---|---|
| CRP-R-1 | point 6, OQ-4, OQ-5 | MUST |
| CRP-R-2 | OQ-6 | MUST |
| CRP-R-3 | point 6 | MUST |
| CRP-R-4 | global-filters contract | MUST |
| CRP-R-5 | sibling endpoints | MUST |
| CRP-R-6 | reminder use case | SHOULD |
| CRP-R-7 | R-1 of parent | MUST |
