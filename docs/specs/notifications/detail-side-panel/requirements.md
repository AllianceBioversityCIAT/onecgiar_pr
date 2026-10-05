# Notification Detail Side Panel — Requirements

## 1. Document Control

- **Module:** `notifications`
- **Sub-feature:** `detail-side-panel`
- **Owner:** Santiago Sanchez
- **Status:** approved (2026-10-05)
- **Depth:** Standard (client layout + one additive read endpoint; no migration, no change to decision logic)
- **Type:** Change
- **Approval Mode:** gated
- **Ticket(s):** none yet
- **Proposal:** `docs/specs/notifications/detail-side-panel/proposal.md` (approved 2026-10-05; decisions D1–D4 in its §12)
- **Supersedes:** `NOTIF-R-9` (no approval chain) and, for the RESULT-card grid only, `NOTIF-R-5`/`NOTIF-AC-7` ("omit missing field") — both approved by the user 2026-10-05.
- **Builds on:** `changes/contribution-request-drawer` (CRD-*), `notifications/inbox-revamp` (NOTIF-*), `notifications/bilateral-primary-sp-request` (PSR-*).

---

## 2. Executive Summary

On a wide screen (≥ 1280 px) the notification detail opens **docked to the right of the list**, so the list stays visible and usable. On a narrower screen it opens in the **existing drawer**. Both show the same restyled content from the mockup: chips header, sentence, RESULT card with a 6-field grid, a **real approval chain** (submission + every program's decision status), "Where it contributes", the existing ToC/Align step, and the decision footer. The approval chain needs one new read-only endpoint. The data already exists in `share_result_request`, `results_by_inititiative` and `submission`, but no endpoint returns it grouped per result today.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Docked panel** | Non-modal detail column beside the list at ≥ 1280 px. No scrim, no focus trap. |
| **Drawer** | Today's modal right-side sheet (`contribution-request-drawer`), used below 1280 px. Full-screen below 600 px. |
| **Detail content** | The panel body, identical in both containers (§7, DSP-R-5..R-11). |
| **Approval chain** | Ordered list of steps for one result: the program submission, then the primary program, then every contributing program, each with its decision status, actor and date. |
| **Viewer's program** | A program (initiative) the signed-in user holds a role in, the same rule `request/get/received` uses to route requests. |
| **Align step** | The existing bilateral ToC-mapping controls (planned-result question + indicator picker, `NOTIF-R-6`/`CRD-DD-3`). There is **no AOW checklist** in the product. The mockup's "MAP TO YOUR THEORY OF CHANGE" list is a visual frame around this existing step. |

---

## 4. System Context & Scope

### In scope

- Notifications page (`results-notifications`): two-column layout at ≥ 1280 px, docked panel host.
- `notification-item` / `contribution-request-drawer`: render one shared detail content into either container.
- Restyle of the detail content to the mockup (`mockup/docked-panel-detail.png`) using project tokens.
- New read endpoint: approval chain for one result, authorization-gated.

### Out of scope

- Accept/Decline business rules, `PATCH request/update` payload, ToC mapping save logic.
- The row's own inline Accept/Decline popups (`CRD-DD-10` stays).
- List tabs, filters, grouping (as shipped by `inbox-revamp`).
- Header bell popup, Settings page, email notifications.
- A new AOW selector (does not exist; see Glossary).

---

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Science Program member deciding requests (laptop) | Reads the detail while still seeing the list. Moves row to row without closing anything. |
| Same persona (tablet/phone) | The same drawer as today, with richer content. |
| Any requester (Sent rows) | Sees where their request stands in the approval chain. |

---

## 6. User Stories

- **DSP-US-1** — As a program member on a laptop, I want the detail beside the list, so that I can triage several requests without losing my place.
- **DSP-US-2** — As a program member, I want to see who already accepted or is still pending on a result, so that I decide with context.
- **DSP-US-3** — As a mobile/tablet user, I want the same information in the drawer, so that nothing is desktop-only.

---

## 7. Functional Requirements

### Required (MUST)

#### DSP-R-1 — Container by viewport

The system MUST open a notification's detail in a **docked panel** when the viewport is ≥ 1280 px wide, and in the **existing drawer** when it is < 1280 px.

##### Scenario: Wide screen

- GIVEN the viewport is 1440 px wide and no detail is open
- WHEN the user activates a row (click / Enter / Space on the row body)
- THEN a panel appears to the right of the list, inside the page layout
- AND the list remains visible and scrollable, and its rows remain clickable
- BUT it must NOT show a scrim, trap focus, or block page scroll
- AND IT MUST be 380 px wide at 1280–1599 px and 440 px wide at ≥ 1600 px

##### Scenario: Narrow screen

- GIVEN the viewport is 1024 px wide
- WHEN the user activates a row
- THEN the existing drawer opens with the same detail content
- AND below 600 px it covers the full screen, as it does today

#### DSP-R-2 — One detail at a time

The system MUST show at most one notification detail at a time.

##### Scenario: Swap rows while docked

- GIVEN the docked panel shows notification A
- WHEN the user activates row B
- THEN the panel shows B
- AND A's in-progress state (decline confirmation, unsaved Align selection) is discarded
- BUT it must NOT carry any of A's in-progress state into B (keeps `NOTIF-AC-5`)

##### Scenario: Re-activate same row

- GIVEN the docked panel shows A
- WHEN the user activates row A again
- THEN the panel closes (keeps `NOTIF-R-11` toggle)

#### DSP-R-3 — Close and lifecycle

The docked panel MUST close when the user presses ✕, when the user presses Escape with focus inside the panel, when the Received/Sent context switches (`NOTIF-R-8`), or when the row it belongs to leaves the rendered list (filter, tab, search, reload). The list MUST then return to full width.

##### Scenario: Row filtered away

- GIVEN the docked panel shows A
- WHEN a filter removes A from the list
- THEN the panel closes
- BUT it must NOT keep showing A's detail or actions for a row that is no longer rendered

#### DSP-R-4 — Resize across the breakpoint

WHEN the viewport crosses 1280 px while a detail is open, the system MUST move the same notification into the other container and preserve its in-progress state (mode, Align selection, decline confirmation).

##### Scenario: Shrink while deciding

- GIVEN the docked panel shows A in decline-confirmation
- WHEN the window is resized to 1100 px
- THEN the drawer opens showing A, still in decline-confirmation
- AND IT MUST NOT show both containers at the same time

#### DSP-R-5 — Header and chips row

The detail content MUST show a title naming the request kind (e.g. "Contribution request", "Primary program request", "Contributor request", or the update's `NotificationType` label), a close control, and a chips row with: decision status ("Needs your decision" / "For your information"), funding window (`W1/W2` / `W3/Bilateral`), result level · type, and the notification date (`DD Mon YYYY`).

#### DSP-R-6 — Sentence

The detail content MUST show the same sentence the row shows (same parts, same codes in mono, result code + title as a link to the result), including the PSR lead-code and "on behalf of" variants.

#### DSP-R-7 — RESULT card with grid

The detail content MUST show a RESULT card with the linked `code - title` and a two-column grid of exactly six fields in this order: Reporting center, Result type, Primary Science Program, Contributing programs, Submitted by, Phase.

##### Scenario: All fields present

- GIVEN the result has all six values
- WHEN the panel opens
- THEN all six labels and values render, program codes in mono

##### Scenario: Value not applicable

- GIVEN a W1/W2 result with no reporting center
- WHEN the panel opens
- THEN "Reporting center" renders with a muted `–`
- BUT it must NOT invent a value or drop the label (supersedes `NOTIF-AC-7` for this grid)

#### DSP-R-8 — Approval chain

The detail content MUST show an APPROVAL CHAIN section listing, in order: (1) program submission, (2) the primary Science Program, (3) every contributing program with an active request or accepted contribution on the result. Each step shows a status icon, program code + name (or "Program submission"), actor and date when known, and a status pill.

##### Scenario: Mixed statuses (mockup case)

- GIVEN result 9400 is submitted by Samuel Otieno, primary SP04, SP07 accepted, SP01 pending and SP01 is the viewer's program
- WHEN the panel opens
- THEN the steps are: Program submission — Submitted (Samuel Otieno · 25 Sep 2026); SP04 — Accepted; SP01 — Awaiting decision, marked "Your program", subtitle "Contributing program"; SP07 — Accepted (Marta Kowalski · 25 Sep 2026)
- AND completed steps show a filled check, pending steps an open ring, declined steps a distinct declined icon/pill

##### Scenario: Loading and failure

- GIVEN the chain request is in flight
- THEN the section shows a skeleton, and the rest of the panel is already usable
- WHEN the request fails
- THEN the section shows an inline error with Retry
- BUT it must NOT block Accept/Decline or hide the rest of the panel

##### Scenario: After a decision

- GIVEN the viewer accepts or declines from the panel
- WHEN the decision succeeds
- THEN the panel closes and the list refreshes, as today (`CRD-R-8`)
- AND the next time the viewer opens that notification, the chain is fetched again and the viewer's step shows the new status
- BUT it must NOT send a chain request that can no longer be displayed (the panel is already closing) (pivot DSP-T-2, user-approved 2026-10-05)

##### Scenario: Result not yet submitted

- GIVEN the result has no submission record
- THEN the submission step shows the result's current status (e.g. "Editing") with a pending ring and no actor/date

#### DSP-R-9 — Where it contributes

The detail content MUST keep the "Where it contributes" review tables with their current behavior (`CRD-R-4` in decide/confirm-decline, hidden-when-empty in view mode), placed after the approval chain.

#### DSP-R-10 — Theory of Change section

For a bilateral request in decide/confirm-decline mode, the detail content MUST show the existing Align step under a "MAP TO YOUR THEORY OF CHANGE" heading with helper text, restyled to the mockup's list rhythm where the existing controls allow it.

- BUT it must NOT change what is saved or when (`NOTIF-R-6`, `CRD-DD-3`)
- AND IT MUST stay hidden for primary requests (`showAlignSlot=false`, PSR) and in view mode

#### DSP-R-11 — Footer

The detail content MUST keep today's footer states and actions (decide / confirm-decline / none in view mode, kind-aware Accept label, blocked reason, helper, busy spinners) in a footer pinned to the bottom of the container.

#### DSP-R-12 — Approval chain endpoint (server)

The system MUST expose an authenticated read endpoint that returns the approval chain for one result.

##### Scenario: Authorized viewer

- GIVEN the user has a notification (received or sent request) for result R, or is an admin
- WHEN the client requests the chain for R
- THEN the response contains the submission step and one entry per program (code, name, role primary/contributor, status, actor name, date)

##### Scenario: Unauthorized viewer

- GIVEN the user has no role on any program involved in R and is not an admin
- WHEN they request R's chain
- THEN the endpoint responds 403
- BUT it must NOT leak any program, user name or status of R

### Should (SHOULD)

- **DSP-R-13** On opening the docked panel, focus SHOULD move to the panel heading. On closing it, focus SHOULD return to the originating row.
- **DSP-R-14** The docked panel SHOULD be sticky (stays in view while the list scrolls), with its body scrolling independently and the footer always visible.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | Chain endpoint p95 < 500 ms for a result with ≤ 20 programs. At most one chain call per panel open (none on decision; the next open fetches fresh — pivot DSP-T-2). |
| Security | JWT `auth` header (client convention). Authorization as DSP-R-12. No tokens or PII in logs (`.cursorrules`). |
| Backwards compatibility | Additive only: no existing endpoint shape changes, no migration. |
| Accessibility | WCAG 2.1 AA. Panel is a labelled `region`/`complementary`. Status is never conveyed by color alone (pill text). Keyboard reachable. |
| Internationalization | All new strings in `src/app/internationalization/`. |
| Motion | Panel open/close respects `prefers-reduced-motion`. |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| DSP-AC-1 | 1440 px viewport | Click row A | Docked panel shows A. List still clickable. No scrim. |
| DSP-AC-2 | Docked A | Click row B | Panel shows B. A's state is gone. |
| DSP-AC-3 | 1024 px viewport | Click row A | Drawer opens with the same content. |
| DSP-AC-4 | Docked A in confirm-decline | Resize to 1100 px | Drawer shows A in confirm-decline. Only one container. |
| DSP-AC-5 | Docked A | A is filtered out / Received↔Sent switch | Panel closes and the list is full width. |
| DSP-AC-6 | Mockup data (9400) | Open | Chain matches DSP-R-8 main scenario exactly. |
| DSP-AC-7 | Chain call fails | Open | Inline error + Retry. Accept/Decline still usable. |
| DSP-AC-8 | Viewer accepts from panel, then reopens that notification | Success, then reopen | Panel closed on success (`CRD-R-8`). On reopen, a fresh chain request is made and the viewer's step shows Accepted. No chain request is sent between the success and the close. |
| DSP-AC-9 | Unrelated user | GET chain | 403, no data. |
| DSP-AC-10 | W1/W2 result with no center | Open | Grid shows Reporting center `–` (muted). |

---

## 10. Defect Classes & Verification Coverage

| Defect class | Example | Catching check |
|---|---|---|
| Wrong container for viewport | Drawer opens at 1440 px | Client Jest with a mocked `BreakpointObserver` → asserts the target container (DSP-AC-1/3) |
| Stale or double panel | A still docked after it is filtered out; both containers open after a resize | Client Jest on the coordinator service + row destroy (DSP-AC-4/5) |
| State leak across rows | A's decline-confirm shows on B | Client Jest (DSP-AC-2) |
| Chain data wrong (order, status mapping, "Your program") | Pending shown as Accepted | Server Jest on the chain service (status mapping, order) + client Jest on chain rendering with fixture = mockup data (DSP-AC-6) |
| Authorization leak | Any user can read any chain | Server Jest: unauthorized → 403 (DSP-AC-9) |
| Decision regression | Accept from panel no longer sends `result_toc_result` | Existing `notification-item` specs must stay green, scoped run |
| **Visual/layout fidelity** (sticky height, widths, spacing vs mockup, no page horizontal scroll, light/dark) | Panel overlaps the footer, wrong width | **jsdom cannot measure layout — no automated gate.** Substitute: manual browser pass at 1280 / 1440 / 1600 / 1024 / 390 px against `mockup/` at the execute HITL pause (or a T6 visual review). Recorded as an accepted gap until done. |
| Non-modal focus behavior | Focus lost on close | Jest asserts focus calls. Real focus order is only proven in the manual browser pass (same gap as CRD-P-3). |

---

## 11. Dependencies & Assumptions

- Data exists today: `share_result_request` (per-program request status, requester/approver, dates), `results_by_inititiative` (owner = primary, contributor role), `submission` (who/when), `result.status_id`. **To confirm in design:** the exact status ids and role ids.
- `@angular/cdk` (layout + portal) is already available through Spartan.
- The Received list only includes requests where the viewer's program is the approver. That is why the chain needs its own endpoint.

---

## 12. Requirement ID Index

| ID | Summary | Strength |
|---|---|---|
| DSP-R-1 | Docked ≥ 1280 / drawer < 1280, widths 380/440 | MUST |
| DSP-R-2 | One detail at a time, swap discards state, toggle | MUST |
| DSP-R-3 | Close triggers + row-leaves-list closes | MUST |
| DSP-R-4 | Resize moves the detail, keeps state | MUST |
| DSP-R-5 | Header + chips row | MUST |
| DSP-R-6 | Sentence parity with row | MUST |
| DSP-R-7 | RESULT card 6-field grid, muted `–` | MUST |
| DSP-R-8 | Approval chain + loading/error/refresh | MUST |
| DSP-R-9 | Where it contributes kept | MUST |
| DSP-R-10 | ToC section = existing Align step, restyled | MUST |
| DSP-R-11 | Footer states kept, pinned | MUST |
| DSP-R-12 | Chain endpoint, authz-gated | MUST |
| DSP-R-13 | Focus in/out | SHOULD |
| DSP-R-14 | Sticky panel, independent scroll | SHOULD |
