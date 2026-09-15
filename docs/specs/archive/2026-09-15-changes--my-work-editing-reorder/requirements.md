# Requirements — My work Editing column manual reorder

**One line:** on **My results**, scope **Mine**, desktop layout, a submitter MAY drag cards within the **Editing** column to set personal priority; order persists in `localStorage` per user/programme/phase — status never changes from the board.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-editing-reorder` · Prefix `MWER` |
| Type | **Change** · Depth **Standard** |
| Approval Mode | gated |
| Date | 2026-09-15 |
| Status | approved |
| Parent spec | archived `changes/my-work-board` (MWB) |
| Depends on | shipped My work board |
| Parallel-safe | yes — client-only |
| Visual reference | user screenshot 2026-09-15 (SP01 Editing column); card chrome from `my-work-card.component.html` + `drag_indicator` handle |

Cites: `docs/prd.md` persona *Result submitter*, `G1` (`M1.3`) · `docs/ux-ui/design.md` §5 SP tabs, §7 status tokens · `docs/trd/trd.md` `W1` (no API change) · archived `MWB-R-5`, `MWB-R-6` (modified).

## 2. Executive Summary

Submitter users want to prioritize their **Editing** queue on the My results kanban instead of accepting the automatic sort (least complete first). v1 adds **in-column drag-and-drop** with **localStorage** persistence on the same browser — no server migration. All other columns, **All program results** scope, and mobile layout remain read-only with no drag affordance.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Manual order** | User-defined sequence of result codes saved for one `(userId, programmeCode, phaseLabel)` scope |
| **Default order** | `orderEditing()` — completeness ascending, ties newest `created` first (unchanged `MWB-R-5`) |
| **Editing column** | Board column `key === 'editing'` (includes `status_id` 1 Editing and 8 Draft) |
| **Reorderable context** | `scope === 'mine'` AND viewport width ≥ 900px AND column is Editing |

## 4. System Context & Scope

### In scope

- Drag handle + CDK reorder within Editing list (Mine + desktop)
- `localStorage` read/write/clear for manual order
- Pure merge helper `applyManualEditingOrder(rows, savedCodes)`
- **Reset to default order** control in Editing column header when manual order exists
- Clear manual order when programme, phase, or Mine↔All scope changes
- Update MWB negative DnD tests to scoped assertions
- Module doc note in `my-work-board` area

### Out of scope

- Cross-column drag; status transitions from board
- Server/API persistence (v2 follow-up `MWER-OQ-2`)
- Reorder in Pending, Submitted, In QA, Approved, Closed columns
- Reorder in **All program results** scope
- Touch/long-press DnD below 900px viewport

## 5. Personas

| Persona | Impact |
|---|---|
| Result submitter | Primary — personal Editing queue priority |
| Programme lead (All scope) | No change — read-only automatic order |
| QA / admin / bilateral consumers | No change |

## 6. Functional Requirements

### `MWER-R-1` — Reorder via drag handle (Editing, Mine, desktop)

The system SHALL allow reordering cards **only** inside the Editing column when scope is **Mine** and viewport width is **≥ 900px**.

#### Scenario: Drag to new position

- GIVEN the user is on `entity-details/SP01/my-work` with scope **Mine**, phase selected, and ≥ 2 Editing cards visible at desktop width
- WHEN the user drags card A using the **drag handle** and drops it below card B
- THEN card A renders below card B in the Editing list
- AND the manual order is saved to `localStorage` for `(userId, SP01, current phase label)`
- BUT it must NOT change any result's `status_id`
- AND IT MUST NOT move cards to another column

#### Scenario: Handle is the only drag surface

- GIVEN a reorderable Editing card
- WHEN the user clicks **Continue**, **Open**, or the ⋮ menu
- THEN navigation or menu opens normally
- BUT dragging must NOT start from those controls or the card body outside the handle

### `MWER-R-2` — Merge manual order with API rows

The system SHALL merge saved manual order with live API data.

#### Scenario: Saved codes keep relative order

- GIVEN a saved manual order `[9177, 9176]` and API returns both rows in Editing
- WHEN the board renders
- THEN 9177 appears before 9176 regardless of `orderEditing()` default

#### Scenario: New cards append after manual block

- GIVEN saved manual order `[9176]` and API adds new Editing card `9200` not in saved order
- WHEN the board renders
- THEN 9176 keeps its saved position among known codes
- AND 9200 appears **after** all manually ordered codes
- AND cards in the "new" tail are sorted among themselves by `orderEditing()`

#### Scenario: Removed cards drop from saved order silently

- GIVEN saved order includes a code no longer in Editing (submitted or deleted)
- WHEN the board renders
- THEN that code is omitted from display
- AND the saved list is rewritten without the stale code on next save (prune on load or save)

### `MWER-R-3` — Default order when no manual preference

When no manual order exists for the current storage key, Editing cards MUST sort by existing `orderEditing()` (`MWB-R-5` unchanged).

### `MWER-R-4` — No drag outside reorderable context

Pending, Submitted, In QA, Approved, Closed, and **All program results** scope MUST NOT expose drag handles, `cdkDrag`, or `[draggable="true"]` on cards.

#### Scenario: All scope read-only

- GIVEN scope **All program results**
- WHEN the board renders Editing cards
- THEN order follows `orderEditing()` only
- AND no drag handle is visible

#### Scenario: Mobile layout

- GIVEN viewport width **< 900px**
- WHEN the board renders
- THEN no drag handle is visible in any column
- AND order follows default rules

### `MWER-R-5` — Reset to default order

When manual order exists for the current key, the Editing column header MUST offer **Reset to default order**.

#### Scenario: Reset clears preference

- GIVEN manual order is saved
- WHEN the user clicks **Reset to default order**
- THEN `localStorage` entry for the current key is removed
- AND cards immediately re-sort by `orderEditing()`
- AND the reset control hides until the user drags again

### `MWER-R-6` — Storage key scope and reset triggers

Manual order MUST be stored under  
`prms.mwb.editing-order.v1::{userId}::{programmeCode}::{phaseLabel}`.

#### Scenario: Phase change clears order

- GIVEN manual order saved for phase *Reporting 2026 - P25*
- WHEN the user switches phase to another loaded phase
- THEN manual order for the new phase loads independently (or defaults if none)
- AND the previous phase's saved order remains stored for when they return

#### Scenario: Programme change

- GIVEN manual order on SP01
- WHEN the user navigates to SP06 My results
- THEN SP06 uses its own storage key (default until user reorders)

#### Scenario: Mine ↔ All toggle clears active manual order display

- GIVEN scope **Mine** with manual order applied
- WHEN the user switches to **All program results**
- THEN cards use automatic order only
- AND when switching back to **Mine**, previously saved manual order for that key is restored

### `MWER-R-7` — Modify archived MWB-R-6 (narrowed)

Archived **MWB-R-6** ("no drag affordance") is **MODIFIED**: drag is permitted **only** under `MWER-R-1`. Continue/Open navigation requirements of MWB-R-6 remain unchanged.

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Accessibility** | Drag handle has accessible name (e.g. "Drag to reorder"); `aria-grabbed` during drag; axe on Editing column at HITL |
| **Performance** | Reorder is O(n) merge on client; no extra API calls |
| **Privacy** | Order is per-browser local preference — tooltip/copy may note "personal order on this device" |
| **Resilience** | `localStorage` read/write failures fail open to `orderEditing()` without user-facing error |
| **i18n** | Handle label, reset button, optional hint in a small copy map (American English v1) |

## 8. Defect Classes & Verification Gates

| Defect class | Gate | Substitute if no automation |
|---|---|---|
| Wrong merge order (saved vs new cards) | Jest `applyManualEditingOrder` + service specs | — |
| Drag enabled in wrong scope/viewport | Jest DOM + Cypress scoped assertions | HITL 375px check |
| Continue/menu broken by drag | Jest — handle-only `cdkDragHandle` | Manual click test |
| Stale codes in storage | Jest prune case | — |
| localStorage not persisting F5 | — | **HITL** reload check |
| a11y on handle | — | **HITL axe** on Editing column |
| Layout inside scroll column | — | **HITL** drag with 8+ cards |

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| **MWER-AC-1** | Drag handle reorders Editing cards (Mine, ≥900px); F5 preserves order |
| **MWER-AC-2** | New Editing card appends after manual block |
| **MWER-AC-3** | Reset restores `orderEditing()` order |
| **MWER-AC-4** | All scope + other columns: zero drag affordance |
| **MWER-AC-5** | `<900px`: no drag handle |
| **MWER-AC-6** | Continue and ⋮ still work on reorderable cards |

## 10. Open Questions (resolved)

| ID | Resolution |
|---|---|
| **MWER-OQ-1** | Clear display order on Mine↔All; restore saved order when returning to Mine |
| **MWER-OQ-2** | Server persistence deferred v2 |
| **MWER-OQ-3** | Reset control in Editing header — **yes** |
| **MWER-OQ-4** | Draft (`status_id=8`) included in same Editing reorder list — **yes** |

## 11. Requirement → Task Coverage

| Requirement | Task |
|---|---|
| MWER-R-1, R-7 | MWER-T-3 |
| MWER-R-2, R-3, R-6 | MWER-T-1 |
| MWER-R-4 | MWER-T-3, MWER-T-4 |
| MWER-R-5 | MWER-T-3 |
| NFR a11y partial | MWER-T-4 (HITL) |
| MWER-AC-* | MWER-T-1…T-4 |
