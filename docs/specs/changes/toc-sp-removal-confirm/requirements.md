# Requirements — Confirm, don't block, removal of ToC-mapped contributors

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results` → `rd-contributors-and-partners` (client-only) |
| Spec path | `changes/toc-sp-removal-confirm` |
| Type | Change |
| Deliverable | software |
| Depth | Standard (small) |
| Approval Mode | gated |
| Owner | Santiago Sanchez |
| Status | approved (2026-11-27) |
| Ticket(s) | — (Teams request from Nicoleta Trifa, 2026-11-27) |
| Proposal | [`proposal.md`](./proposal.md) |
| Scope decisions (2026-11-27, Santiago) | Q1 → Centers are included. Q2 → generic copy (the item is not named). P2-3249 conflict → relax: any Contributing Center counts. Judgment Day round 1 → panel deselect also confirms; asterisks unchanged |
| Supersedes | `changes/toc-science-program-guard` (`TOC-SP-DD-1`), `changes/toc-center-guard` (`TOC-C-DD-1`), P2-3249 "ToC Center must remain" rule |

## 2. Executive Summary

A submitter can always remove a Contributing Science Program or Contributing CGIAR Center, even when it came from the ToC. Removing the **last** ToC-mapped one asks for confirmation (Yes/Cancel) instead of refusing. Centers added through "Other(s)" now satisfy the "at least one Contributing CGIAR Center" rule, so a confirmed removal does not leave a red error the user cannot clear.

## 3. Glossary

| Term | Meaning |
|---|---|
| ToC-origin item | A Science Program in `scienceSelected`, or a Center in `contributing_center`. Both are fed by dropdown 1 (preselected from the ToC) |
| Other item | A Science Program or Center picked through the "Other(s)" dropdown |
| Sentinel | The "Other(s)" chip in dropdown 1. It is a UI control, not a contributor |
| ToC-planned | The result is ToC-mapped (`planned_result !== false`) and the ToC brought ≥1 reference id for that field |

## 4. System Context & Scope

Current behavior (each claim cited):

- Removing the last ToC-origin Science Program on a ToC-planned result is blocked with an "Ok"-only warning. Source: `rd-contributors-and-partners.component.ts:861-880`.
- The same block exists for Centers. Source: `component.ts:701-712` and `:940-947`.
- The alert service already supports Cancel/Confirm with a callback. Source: `customized-alerts-fe.service.ts:60-81`.
- P2-3249: when the ToC brings Centers, only ToC-origin Centers satisfy completeness. Source: `component.ts:577-589` (`requiresTocCenter`, `contributingCentersComplete`). The rule feeds the inline error `cp-centers-validation` and the bottom-bar marker `cp-centers-mandatory-marker` (`component.html:245-263`).
- The server green check `validation_contributor_partner_P25` does not count contributing initiatives or centers. Source: `onecgiar-pr-server/src/migrations/1792100000000-TKG-TocKpiOptionalGreenCheck.ts:117-181`.

- The app bootstraps zoneless, so a native DOM callback does not repaint by itself. Source: `shared/services/view-refresh.service.ts:6-7`.
- Unticking an item in the open dropdown panel removes it with no guard at all. Source: `custom-fields/pr-multi-select/pr-multi-select.component.ts:482-499`.

**In scope:** the two delete handlers in `rd-contributors-and-partners`, a panel-deselect hook (an additive, opt-in input on `pr-multi-select`), the P2-3249 completeness rule and its copy and markers, the lead auto-assign guard against the sentinel, the matching tests, and the folder `CLAUDE.md` files.

**Out of scope:** the ToC preselection effects, IPSR's own `deleteContributingCenter` (`ipsr-contributors.component.ts:190` has no guard), the AOW create modal, the server, the payload, and the required asterisks on the two Centers dropdowns (they stay as they are; visual only).

## 5. Stakeholders / Personas

| Persona | Change |
|---|---|
| Result submitter (P25, ToC-mapped) | Can remove any ToC-mapped Science Program or Center after one confirmation. "Other(s)" Centers satisfy the Centers requirement |
| CGIAR System Org (Nicoleta) | Request met: contributions can be changed regardless of ToC info |

## 6. Functional Requirements

### TRC-R-1 — Confirm before removing the last ToC-origin Science Program

The system SHALL ask for confirmation, instead of blocking, when the user removes the last ToC-origin Contributing Science Program of a ToC-planned result.

#### Scenario TRC-S-1.1: Confirm removes it

- GIVEN a ToC-planned result with exactly one ToC-origin Science Program
- WHEN the user clicks the chip's remove icon
- THEN a warning dialog opens with title "Science Program mapped in the Theory of Change", body "This Science Program is mapped in the Theory of Change for the selected indicator. Are you sure you want to remove it?", and the buttons `Cancel` / `Yes, remove it`
- AND the chip is still present while the dialog is open
- WHEN the user clicks `Yes, remove it`
- THEN the chip is removed exactly as an ordinary removal removes it, including the existing Other(s) cascade line
- AND IT MUST disappear from the screen with no further user interaction
- AND IT MUST be persisted on the next save like any other edit

#### Scenario TRC-S-1.2: Cancel keeps it

- GIVEN the dialog from TRC-S-1.1 is open
- WHEN the user clicks `Cancel` or the backdrop
- THEN `scienceSelected` is unchanged
- BUT it must NOT run the removal

#### Scenario TRC-S-1.3: No dialog when not the last one, or not ToC-planned

- GIVEN a ToC-origin Science Program is removed while ≥2 ToC-origin ones remain, OR the result is not ToC-planned, OR the chip removed is the "Other(s)" sentinel, OR the item is an "Other" Science Program
- WHEN the user removes it
- THEN it is removed immediately
- BUT it must NOT open any dialog

#### Scenario TRC-S-1.4: Unticking in the open dropdown panel

- GIVEN the same state as TRC-S-1.1, with the Science Program dropdown panel open
- WHEN the user unticks the last ToC-origin Science Program in the panel
- THEN the same dialog opens and the option stays ticked
- AND Yes / Cancel behave as in TRC-S-1.1 / TRC-S-1.2
- BUT it must NOT change how any other `pr-multi-select` instance in the app behaves

### TRC-R-2 — Confirm before removing the last ToC-origin Center

The system SHALL apply TRC-R-1 to Contributing CGIAR Centers, with the title "Contributing CGIAR Center mapped in the Theory of Change" and the body "This Contributing CGIAR Center is mapped in the Theory of Change for the selected indicator. Are you sure you want to remove it?".

#### Scenario TRC-S-2.1: Confirm removes it, with the lead side effects

- GIVEN a ToC-planned result with exactly one ToC-origin Center, which is also the Lead center
- WHEN the user confirms the removal
- THEN the Center is removed, `leadCenterCode` is cleared, and the lead options are recomputed, exactly as an ordinary removal does
- AND IT MUST NOT auto-assign the "Other(s)" sentinel as Lead center when the sentinel is all that is left in the union

#### Scenario TRC-S-2.2: Cancel keeps it

- GIVEN the Center dialog is open
- WHEN the user cancels
- THEN `contributing_center`, `otherCentersSelected` and `leadCenterCode` are unchanged
- BUT it must NOT run the lead-center recompute or auto-assign at all (opening the dialog has no side effect)

#### Scenario TRC-S-2.3: Same exemptions as TRC-S-1.3

- Not last / not ToC-planned / sentinel / "Other" Center → immediate removal, no dialog.

#### Scenario TRC-S-2.4: Unticking in the open dropdown panel

- Same as TRC-S-1.4, for the Contributing CGIAR Centers dropdown (both the ToC split dropdown and the flat dropdown, since both bind `contributing_center`).

### TRC-R-3 — Any Contributing Center satisfies the Centers requirement

The system SHALL treat the "Contributing CGIAR Centers" field as complete when at least one real Center is selected, from the ToC or from "Other(s)", whether or not the ToC brings Centers.

#### Scenario TRC-S-3.1: Only "Other(s)" Centers on a ToC-planned result

- GIVEN a 2026 result whose ToC brings Centers, with 0 ToC-origin Centers and ≥1 "Other" Center
- WHEN the section renders and the mandatory scan runs
- THEN no `cp-centers-validation` error is shown
- AND the bottom-bar scan does not list a Centers gap
- AND the Centers card is not painted as incomplete

#### Scenario TRC-S-3.2: No Centers at all

- GIVEN any result with 0 real Centers (the sentinel does not count)
- THEN the error shows "Please select at least one Contributing CGIAR Center."
- AND the scan lists "Contributing CGIAR Centers"
- BUT it must NOT mention "Theory of Change" or "Other(s)" in that message or label

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| TRC-NFR-1 | No change to the PATCH payload, the API, the DB or the server green check |
| TRC-NFR-2 | The dialog reuses `customizedAlertsFeSE` (existing look, the `Cancel` button, the backdrop click cancels). No new component |
| TRC-NFR-3 | Copy is static text, so there is no HTML-escaping surface |

## 8. Defect classes and gates

| Defect class | Gate |
|---|---|
| Confirm callback never deletes / deletes on Cancel | Jest: capture the `show` callback, invoke it / don't, and assert the arrays |
| Removal fires before confirmation | Jest: assert the arrays are unchanged right after the handler returns |
| Exemptions regress (dialog on a non-last item, the sentinel or an "Other" item) | Jest per exemption |
| Callback runs outside change detection (the app is zoneless), so the chip stays visible | Jest **zoneless** DOM test: the real `CustomizedAlertsFeService`, a click on `#confirm-<id>`, then assert the chip is gone **with no manual `detectChanges`**. Plus a manual browser check at the HITL pause |
| Panel deselect bypasses the dialog, or the new hook changes other `pr-multi-select` instances | Jest on the parent hook; Cypress CT on `pr-multi-select` (`npm run test:ct`, the gate for `custom-fields/`) with the hook unset and set |
| Cancel has a side effect on the lead | Jest: snapshot `leadCenterCode`, `contributing_center` and `otherCentersSelected` before the click and assert they are equal after Cancel |
| P2-3249 relax not reflected in the DOM scan | Jest zoneless spec runs the real `someMandatoryFieldIncompleteResultDetail` over the template |
| Template/type error | `npm run build` (templates are not type-checked by `tsc` or Jest) |

## 9. Requirement ID Index

| ID | Title |
|---|---|
| TRC-R-1 | Confirm before removing the last ToC-origin Science Program (S-1.1, S-1.2, S-1.3, S-1.4) |
| TRC-R-2 | Confirm before removing the last ToC-origin Center (S-2.1, S-2.2, S-2.3, S-2.4) |
| TRC-R-3 | Any Contributing Center satisfies the Centers requirement (S-3.1, S-3.2) |
| TRC-NFR-1..3 | No payload change, reuse the alert, static copy |
