# Requirements — Bilateral ToC: no justification field when the answer is "No"

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/toc-why-reported-bilateral/` |
| Module code | `BIL-TOC-WR` |
| Type | Change · Depth: **Lite** (one Angular component, no server/DTO/migration change) |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | draft |
| Owner | PRMS bilateral team · Requester: verbal PO decision (no ticket yet) |
| Date | 2026-09-18 |
| Baseline | `docs/ux-ui/design.md` — bilateral result form, Contributors & partners · `docs/trd/trd.md` — bilateral module ToC read/write path |
| Intent source | `proposal.md` (2026-09-18) |
| Related | `docs/specs/bilateral/toc-default-linkage/` — same component; its `:145`/`:156` describe the legacy unplanned fallback this spec removes from the UI |

## Executive Summary

In the bilateral result form (Contributors & partners → ToC block), answering **"No"** to *"Can this result be mapped to a ToC KPI?"* stops asking for a written justification. The **"Why is this result being reported?"** textarea is removed from the bilateral flow. The "Yes" branch, the P/A defer checkbox and the project-default flow are untouched, and no stored justification is deleted.

## Scope

- **In:** `section-toc.component` (template, gate, handler, checklist item) and its Jest spec.
- **Out:** the classic W1/W2 form (`rd-contributors-and-partners`), the server, the DTO, the `validation_*` procedures, and any cleanup of historical `toc_progressive_narrative` values.

## Functional Requirements

### BIL-TOC-WR-R-1: Answering "No" asks for nothing further

The bilateral ToC block SHALL render no justification field when the reporter answers "No".

#### Scenario: Reporter answers No

- GIVEN a bilateral result whose ToC question is unanswered
- WHEN the reporter selects **No** on *"Can this result be mapped to a ToC KPI?"*
- THEN no *"Why is this result being reported?"* textarea is rendered, and no required marker appears below the question
- AND `planned_result = false` is still persisted by the existing autosave
- BUT it must NOT alter the **Yes** branch (level → node → indicator → contribution → pathway narrative) in any way
- AND IT MUST leave the `I'm not sure, the P/A will complete the ToC mapping` checkbox behaving exactly as today

#### Scenario: Reopening a result already answered No

- GIVEN a bilateral result saved earlier with `planned_result = false` and a stored justification
- WHEN the reporter reopens the form
- THEN the answer shows **No** and no justification field is rendered
- BUT it must NOT render the stored text anywhere in the section

### BIL-TOC-WR-R-2: No stored justification is destroyed

Removing the field from the UI SHALL NOT cause the stored value to be lost.

#### Scenario: Autosave on a result that already has a justification

- GIVEN a bilateral result with `planned_result = false` and a non-empty `toc_progressive_narrative` on its active `results_toc_result` row
- WHEN the form autosaves the ToC block again (any trigger)
- THEN the active row still holds the identical `toc_progressive_narrative` value afterwards
- AND IT MUST be sent in the autosave payload rather than omitted — on this path the server deactivates the row and **inserts a new one** (`results-toc-results.service.ts:2674 _handleUnplannedSpecialCase`, `:2697` writes `?? null`), so an omitted key nulls the value instead of preserving it

### BIL-TOC-WR-R-3: Section completeness is unchanged

The section checklist SHALL stop publishing the `toc-why-reported` item, with no effect on the Submit gate.

#### Scenario: Submit readiness after the change

- GIVEN a bilateral result answered **No** with a lead centre and a primary Science Program
- WHEN the reporter looks at the section checklist and the Submit-for-review control
- THEN Submit is available exactly as before the change
- AND IT MUST NOT change the completeness percentage, because every `toc` item is already `optional: true`

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| BIL-TOC-WR-N-1 | No server, DTO, migration or stored-procedure change. |
| BIL-TOC-WR-N-2 | The retained-but-hidden `whyReported` value must carry an inline comment citing `_handleUnplannedSpecialCase`, so it is not later deleted as dead code. |

## Defect Classes And Their Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| The textarea still renders on "No" | `npx jest --testPathPattern="section-toc"` — a DOM assertion on the rendered fixture (the spec compiles the real template; there is **no** `overrideComponent`). If the child controls cannot render in the harness, this degrades to a presence-check on the template + the manual check below |
| Stored justification silently nulled on the next autosave | Jest: hydrate `toc_progressive_narrative`, trigger a save on the unplanned branch, assert the key is still in the payload with the same value |
| The "Yes" branch or the P/A checkbox regressed | The existing `section-toc.component.spec.ts` suite staying green |
| Type/lint breakage from the removed members | `npx ng lint --quiet` |
| **Unmeasured:** that the field is actually gone on the real screen | **No automated gate.** Substituted by a human check at the HITL pause: `/bilateral/<centre>/result/<id>?phase=<n>` → Contributors & partners → answer **No** → nothing renders below the question. Recorded as an accepted, substituted gap |

## Requirement ID Index

| ID | Behavior |
|---|---|
| BIL-TOC-WR-R-1 | "No" renders no justification field; Yes branch and defer checkbox untouched |
| BIL-TOC-WR-R-2 | Stored `toc_progressive_narrative` survives subsequent autosaves |
| BIL-TOC-WR-R-3 | Checklist drops the item; Submit gate unchanged |
| BIL-TOC-WR-N-1 | Client-only change |
| BIL-TOC-WR-N-2 | Inline comment protecting the retained value |
