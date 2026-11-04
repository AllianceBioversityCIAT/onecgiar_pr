# Contribution Request Drawer — Requirements

> **Pivot 2026-09-25:** the three popups and the inline ToC block are **kept** for the row's Accept/Decline buttons. The drawer is an additional entry from the row body with its own flow (CRD-R-10, R-11 amended). Where the answer-first paragraph below says "replaces", read "adds a second flow alongside".
>
> **Answer first:** in Notifications → Requests → Received, clicking a **pending** contribution request opens a right-side drawer. It shows the result, where it contributes (7 ToC fields), the optional "Align to your Theory of Change" mapping (today's logic, moved inline), and a sticky Decline / Accept contribution footer. The drawer replaces the inline ToC block and the three popups (reject confirm, "Map to ToC?" prompt, mapping step). The decision still goes out as the same single `PATCH_updateRequest`.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `notifications` (client only) |
| Sub-feature | Contribution request detail drawer |
| Owner | Santiago Sanchez |
| Status | approved (Santiago Sanchez, 2026-09-25) |
| Depth | **Standard**: one client folder, no API/payload/migration change |
| Type | Change (inherited from `proposal.md`) |
| Approval Mode | gated (inherited) |
| Ticket | none |
| ID prefix | `CRD-`. `NOTIF-R-*` and `NOTIF-T-*` are already used by other notification specs |
| Proposal | `proposal.md` (approved 2026-09-25). OQ-2 and OQ-3 are resolved there and binding here |
| Visual source | `C:\Users\santiagosanchez\Downloads\PRMS Reporting_Tool_interface_(1)\PRMS Reporting.dc.html`, drawer markup ~L7688-7766, logic `const ntd` ~L15128-15188 (read 2026-09-25) + the two user screenshots |

## 2. Context

The submitter decides on contribution requests from `results-notifications/pages/requests/received`. Today each row carries Accept/Decline. The ToC fields render inline and always expanded, only for `is_map_to_toc` requests. Bilateral accepts go through up to three `app-pr-dialog` popups. The mockup puts all of this in one drawer opened from the row.

Baseline citations:
- `docs/prd.md`: US-S3 (sharing and contribution), AC-8 (user-facing decisions fire notifications; unchanged here).
- `docs/ux-ui/design.md`: "drawer for review; modal for confirm/destroy" layout rule; DD-10 (notifications). Client hard UI rules #1-#4, #8, #16, #18, #20-#22 (`onecgiar-pr-client/CLAUDE.md` §5).
- `docs/trd/trd.md`: Notification module row; W4 Notifications. No server change.
- Extends `components/notification-item/` (see its `CLAUDE.md`, P2-3085, P2-3187 AC1-AC6, P2-3204).

## 3. In Scope / Out of Scope

### In scope

- Opening the drawer from a pending Received row, by pointer and keyboard.
- Drawer content: header sentence, Result card, "Where it contributes", "Align to your Theory of Change" (bilateral only), footer actions.
- An inline decline confirmation and the bilateral ToC mapping **inside the drawer**, as the drawer's own flow.
- *(Amended 2026-09-25, pivot.)* Row-level Accept/Decline and their three popups, and the inline ToC block, **stay exactly as today**. The drawer is a second entry point, reached from the row body, with its own flow. Users who never open the drawer keep the flow they know.

### Out of scope

- Any change to `PATCH_updateRequest`, its payload, or `GET .../request/get/received|sent`.
- Replacing the mapping with the mockup's single "Select an indicator" dropdown, and mapping several items per accept. Deferred to a follow-up spec (proposal OQ-3).
- A drawer for accepted/declined rows (proposal OQ-2), for Sent rows, or for the Updates tab.
- The legacy non-bilateral `is_map_to_toc: false` flow. Accepting still opens the global `<app-share-request-modal>`, unchanged.
- The pre-existing phase lock in `invalidateRequest()` (closed phase 34 on prtest).

## 4. Personas Affected

| Persona | What changes |
|---|---|
| Result submitter (contributor side, deciding the request) | Clicks a pending request to see full details and decide in one panel; no more popups |
| Requester (Sent tab) | Nothing |
| QA / PMU / admin | Nothing, beyond admins being the only users able to decide closed-phase requests (pre-existing) |

**CRD-US-1**: as a submitter, I want to open a pending contribution request and see the result and where it contributes before deciding, so that I decide with full context. *Refines US-S3.*
**CRD-US-2**: as a submitter of a bilateral contribution, I want to optionally map the result to my Theory of Change in the same panel where I accept, so that I don't have to go through a chain of popups. *Refines US-S3, P2-3187 AC4.*

## 5. Glossary

| Term | Meaning |
|---|---|
| Pending request | A Received row with `request_status_id = 1` |
| Decided request | `request_status_id` 2 (Accepted) or 3 (Declined) |
| Bilateral request | `obj_result.source_name === 'W3/Bilaterals'` (derived by the server) |
| ToC-carried request | `is_map_to_toc === true`: the mapping travelled with the request. Not "already mapped" (see `notification-item/CLAUDE.md`) |
| Legacy request | Not bilateral and `is_map_to_toc === false`: accept opens `<app-share-request-modal>` |
| Mapping touched | The user answered the planned-result question in the Align section |
| Decision blocked | `invalidateRequest()` is true (busy, platform closed, QA'd, or phase lock for non-admins) |

## 6. Functional Requirements

### CRD-R-1: Open the drawer from a pending Received row (MUST)

A pending row in Received SHALL open the drawer for that request, by click anywhere on the row or by Enter/Space when the row has focus.

#### Scenario: Pointer open
- GIVEN a pending request row in Received
- WHEN the user clicks the row body
- THEN the drawer opens on the right showing that request
- BUT a click on the row's result link, bilateral result link, Accept or Decline button must NOT also open the drawer through the row handler (each keeps its own action)

#### Scenario: Keyboard open
- GIVEN focus is on a pending row
- WHEN the user presses Enter or Space
- THEN the drawer opens
- AND IT MUST expose the row as an interactive control (focusable, with an accessible name that includes the result code)

#### Scenario: Rows that do not open
- GIVEN a decided row (status 2/3) in Received, or any row in Sent
- WHEN the user clicks it
- THEN nothing opens and the row shows no interactive affordance (no pointer cursor, not focusable)

### CRD-R-2: Drawer header (MUST)

The header SHALL show the title "Contribution request", one sentence naming requester, requester code, responder code, result code and title, and a close button.

#### Scenario: Non-bilateral sentence
- GIVEN a non-bilateral pending request from Priya Raghavan of SP06 to SP01 on result 9377
- WHEN the drawer opens
- THEN the sentence reads "Priya Raghavan from **SP06** has asked **SP01** to contribute to result **9377** – {title}", with codes in mono
- AND IT MUST use the same requester/responder resolution as the row (`requesterCode` / `responderCode`)

#### Scenario: Bilateral sentence
- GIVEN a bilateral pending request
- WHEN the drawer opens
- THEN the sentence names the reporting Center, the responder code and the result, with no invented requester name

### CRD-R-3: Result card (MUST)

The body SHALL show a "RESULT" card with the result code (mono) and title. Clicking it SHALL go to the result the same way the row link does today.

#### Scenario: Open result
- GIVEN the drawer is open
- WHEN the user activates the Result card
- THEN a non-bilateral result opens at `resultUrl()` in a new tab, and a bilateral result navigates to the bilateral review page with its review drawer (`navigateToResult`)
- AND IT MUST close the contribution drawer before a bilateral in-app navigation, so two drawers never stack

### CRD-R-4: "Where it contributes" (MUST)

The body SHALL show a "WHERE IT CONTRIBUTES" table with the rows, in order: Level, High level output / outcome, Outcome statement, Indicator typology, Unit of measurement, Target, Contribution target. It shows one table per `toc_contribution_review` entry, and a single table of dashes when there are none.

#### Scenario: ToC-carried request with data
- GIVEN a request whose `toc_contribution_review` has one entry
- WHEN the drawer opens
- THEN each row shows the entry's value, with Indicator typology resolved by the existing `tocTypologyOf()` rule
- AND Target and Contribution target show in mono with tabular figures

#### Scenario: No review data
- GIVEN a bilateral or legacy request (the server sends no `toc_contribution_review`)
- WHEN the drawer opens
- THEN one table renders with all seven labels and a muted "–" in every value
- BUT it must NOT hide the section or show an error

#### Scenario: Several entries
- GIVEN two review entries
- WHEN the drawer opens
- THEN two tables render, one per entry, in server order

#### Scenario: Long text
- GIVEN an outcome statement longer than three lines
- THEN the value is clamped to 3 lines with an inline "Show more" (hard rule #16)

### CRD-R-5: Align to your Theory of Change, for bilateral requests only (MUST)

For a pending bilateral request, the body SHALL show "ALIGN TO YOUR THEORY OF CHANGE" with the hint "Pick the indicator this result contributes to in your own theory of change. You can do this later." It then shows today's mapping controls: the planned-result question, then the ToC mapping widget with a single tab, seeded with the contributor initiative. Non-bilateral requests SHALL NOT show this section.

#### Scenario: Section visibility
- GIVEN a pending bilateral request
- WHEN the drawer opens
- THEN the section shows the hint and the planned-result question, with nothing answered
- AND the ToC widget appears only after the question is answered (same as today's mapping step)

#### Scenario: Not for other kinds
- GIVEN a ToC-carried or legacy request
- WHEN the drawer opens
- THEN no Align section renders

#### Scenario: Switching planned/unplanned
- GIVEN the user answered the question and picked a node
- WHEN they change the answer
- THEN the selection resets and the widget remounts (today's `onTocPlannedResultChange` behaviour)

#### Scenario: Clear mapping
- GIVEN the mapping is touched
- WHEN the user activates "Clear mapping"
- THEN the section returns to its untouched state

### CRD-R-6: Accept from the drawer (MUST)

"Accept contribution" SHALL record the acceptance with exactly one `PATCH_updateRequest`, routed by the request's own portfolio. The kind of request decides the path:

| Request kind | Mapping state | Accept does |
|---|---|---|
| ToC-carried | n/a | PATCH `request_status_id: 2`, inert ToC payload |
| Bilateral | untouched | PATCH with the inert ToC payload (`{ planned_result: null, result_toc_results: [] }`) |
| Bilateral | touched and complete | PATCH carrying `buildTocMappingPayload()` for the contributor initiative |
| Bilateral | touched and incomplete | Nothing. Accept is disabled with the helper "Complete the mapping or clear it to accept without it." |
| Legacy | n/a | Closes the drawer, then opens `<app-share-request-modal>` as today (no PATCH from the drawer) |

#### Scenario: Plain bilateral accept
- GIVEN a pending bilateral request with an untouched mapping
- WHEN the user clicks Accept contribution
- THEN one PATCH is sent with `request_status_id: 2` and the inert ToC payload
- AND the success toast "Request successfully accepted" shows and the list refreshes

#### Scenario: Accept with mapping
- GIVEN a complete mapping
- WHEN the user clicks Accept contribution
- THEN one PATCH carries the mapping, with every tab using the contributor `initiative_id` and the notification `result_id`
- BUT it must NOT send a second PATCH, and must NOT open `<app-share-request-modal>`

#### Scenario: Incomplete mapping
- GIVEN the question is answered but no node is picked
- THEN Accept is disabled and the helper text is visible
- AND IT MUST stay possible to accept after "Clear mapping" (AC3/AC5 escape hatch)

#### Scenario: Legacy accept
- GIVEN a legacy pending request
- WHEN the user clicks Accept contribution
- THEN the drawer closes first, and only then `<app-share-request-modal>` opens
- BUT the two must NOT be visible at the same time (hard rule #2)

### CRD-R-7: Decline from the drawer, with inline confirmation (MUST)

"Decline" SHALL turn the footer into a confirmation ("Decline this contribution?" · Cancel · Confirm decline) inside the drawer. Only "Confirm decline" sends the PATCH with `request_status_id: 3` and the inert ToC payload.

#### Scenario: Confirm
- GIVEN the drawer is open on a pending request
- WHEN the user clicks Decline, then Confirm decline
- THEN one PATCH is sent with `request_status_id: 3`, and the info toast "Request successfully rejected" shows
- BUT no dialog opens on top of the drawer

#### Scenario: Cancel
- GIVEN the confirmation footer is shown
- WHEN the user clicks Cancel
- THEN the footer returns to Decline / Accept contribution and nothing is sent

### CRD-R-8: Busy, blocked and outcome states (MUST)

#### Scenario: Busy
- GIVEN an accept or decline PATCH is in flight
- THEN the pressed button shows the spinner, both actions and Clear mapping are disabled, and the close control stays available

#### Scenario: Blocked
- GIVEN `invalidateRequest()` is true and nothing is in flight
- THEN Accept and Decline are disabled and the footer shows one reason line: the existing QA text ("This result has been Quality Assessed and no additional contributors can be added.") when QA'd, otherwise "This request can't be decided right now."

#### Scenario: Outcome closes the drawer
- GIVEN a PATCH finishes, with success or error
- THEN the drawer closes before the list is refetched
- AND the success toast or the error toast ("Error when requesting") shows
- AND IT MUST NOT stay open after the refetch showing another request (the list re-renders with `track $index`, so the component instance is reused)

### CRD-R-9: Closing (MUST)

The drawer SHALL close with the ✕, the scrim, or Escape. Closing records nothing; the request stays pending and an in-progress mapping is discarded.

#### Scenario: Close without deciding
- GIVEN the mapping is touched
- WHEN the user presses Escape
- THEN the drawer closes, no PATCH is sent, and focus returns to the row that opened it

### CRD-R-10: Row actions keep today's popup flow (MUST) — *amended 2026-09-25 (pivot)*

The row keeps Accept and Decline, and their behaviour is unchanged from before this spec:
- Row **Accept**: ToC-carried → direct PATCH; legacy → `<app-share-request-modal>`; bilateral → the "Map to your Theory of Change?" prompt dialog, then (on "Map it") the mapping-step dialog.
- Row **Decline**: the reject-confirm dialog.

#### Scenario: Bilateral row accept
- GIVEN a pending bilateral row
- WHEN the user clicks the row's Accept
- THEN the "Map to your Theory of Change?" prompt opens, the drawer does not open, and nothing is sent

#### Scenario: Row decline
- GIVEN any pending row
- WHEN the user clicks the row's Decline
- THEN the reject-confirm dialog opens and the drawer does not open

### CRD-R-11: The drawer flow and the popup flow coexist (MUST) — *amended 2026-09-25 (pivot)*

The component SHALL keep the reject-confirm, "Map to your Theory of Change?" and mapping-step `app-pr-dialog`s for the row buttons, and SHALL keep the inline `toc_review` block under ToC-carried rows. Inside the drawer, decisions use the drawer's own flow (CRD-R-5, R-6, R-7) and never open an `app-pr-dialog`.

#### Scenario: Never both visible
- GIVEN the drawer is open
- WHEN the user accepts, declines or maps from inside the drawer
- THEN no `app-pr-dialog` opens
- AND opening the drawer MUST close any dialog that was open
- AND IT MUST keep the existing guarantee that the bilateral path never opens `<app-share-request-modal>`, in both flows

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Layout | 720px panel on desktop; full width under 640px. Sticky header and footer; only the body scrolls (hard rule #3). One brand button: Accept contribution (hard rule #1) |
| Accessibility | Focus moves into the drawer on open and returns to the originating row on close. Escape closes. Visible focus ring on every control (`--pr-focus-ring`). The panel has an accessible name. WCAG 2.1 AA contrast per `docs/ux-ui/design.md` §10 |
| Tokens | No hex in the component. Only `--pr-*` tokens or their Tailwind aliases (hard rule #8). Px type utilities, not rem (hard rule #20) |
| i18n | Every new string comes from `src/app/internationalization/`, none hardcoded in templates |
| Compatibility | No change to request/response shapes or endpoint versions. `isP25Request` routing preserved |
| Motion | Respects `prefers-reduced-motion` (hard rule #6) |

## 8. Defect classes and their gates

| # | Defect class this spec can produce | Gate |
|---|---|---|
| D-1 | Wrong or double PATCH, wrong payload, wrong endpoint version | Jest with a spy on `PATCH_updateRequest` (count, `request_status_id`, `result_toc_result`, `isP25` arg) |
| D-2 | Drawer opens for the wrong rows (decided, Sent), or the row handler double-fires with inner buttons | Jest template tests on the row host |
| D-3 | Stale drawer after refetch (instance reuse under `track $index`) | Jest: drawer state is closed before `requestEvent` emits |
| D-4 | Modal on top of the drawer (legacy modal, bilateral review drawer) | Jest: drawer closed before `showShareRequest = true` / before navigation |
| D-5 | Incomplete mapping silently dropped, or mapping blocks accept forever | Jest: disabled state plus Clear mapping path |
| D-6 | Visual fidelity: width, sticky regions, single scroll, clamping, ToC widget dropdowns clipped or under the overlay | **No automated check** (jsdom cannot lay out). Substitute: real-browser check at the `/akili-validate` HITL pause against the two screenshots, as a T6 visual review. Needs an admin account or an open-phase bilateral request |
| D-7 | Focus not trapped or not restored, Escape not closing | Escape handler: Jest. Trap and restore: **manual browser check** (same pause as D-6) |
| D-8 | Hardcoded English or hex | Review checklist: grep of the new template for quoted literals and `#` colours |

Accepted risk: none beyond D-6/D-7 being manual.

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| CRD-AC-1 | Pending Received row | Click or Enter | Drawer opens for that request (R-1) |
| CRD-AC-2 | Decided row or Sent row | Click | Nothing opens (R-1) |
| CRD-AC-3 | Request without review data | Open | 7 labels, all "–" (R-4) |
| CRD-AC-4 | Bilateral, untouched mapping | Accept | 1 PATCH, status 2, inert payload (R-6) |
| CRD-AC-5 | Bilateral, complete mapping | Accept | 1 PATCH with the mapping, no legacy modal (R-6) |
| CRD-AC-6 | Bilateral, incomplete mapping | — | Accept disabled + helper; Clear mapping re-enables it (R-6) |
| CRD-AC-7 | Legacy request | Accept | Drawer closed, then legacy modal opens (R-6) |
| CRD-AC-8 | Any pending request | Decline → Confirm | 1 PATCH, status 3; Cancel sends nothing (R-7) |
| CRD-AC-9 | PATCH done (success or error) | — | Drawer closed before `requestEvent` (R-8) |
| CRD-AC-10 | Blocked request | Open | Actions disabled + reason line (R-8) |
| CRD-AC-11 | Drawer open | Escape / ✕ / scrim | Closed, no PATCH (R-9) |
| CRD-AC-12 | Bilateral row | Row Accept | "Map to ToC?" prompt opens, no drawer, no PATCH (R-10, amended) |
| CRD-AC-13 | Drawer open | Any decision | No `app-pr-dialog` over the drawer; the row keeps its 3 popups and inline block; no share-request modal on bilateral (R-11, amended) |

## 10. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| CRD-R-1 | Open from a pending Received row | MUST |
| CRD-R-2 | Header | MUST |
| CRD-R-3 | Result card | MUST |
| CRD-R-4 | Where it contributes | MUST |
| CRD-R-5 | Align to your ToC (bilateral only) | MUST |
| CRD-R-6 | Accept | MUST |
| CRD-R-7 | Decline with inline confirmation | MUST |
| CRD-R-8 | Busy, blocked, outcome | MUST |
| CRD-R-9 | Closing | MUST |
| CRD-R-10 | Row actions keep today's popup flow (amended 2026-09-25) | MUST |
| CRD-R-11 | Drawer flow and popup flow coexist (amended 2026-09-25) | MUST |

## 11. Dependencies & Assumptions

- Server: `share-result-request.service.ts` populates `toc_contribution_review` **only** when `is_map_to_toc` is true (read 2026-09-25, ~L648-705). Bilateral and legacy requests show dashes by design.
- `app-cp-multiple-wps` (from `RdContributorsAndPartnersModule`) is reused as-is.
- Downstream: none (no payload change).

## 12. Open Questions

None blocking. The single-dropdown mapping and multi-item mapping are deferred (proposal OQ-3).
