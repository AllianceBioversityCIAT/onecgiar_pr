# Design — My work Editing column manual reorder

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-editing-reorder/design.md` |
| Requirements | [`requirements.md`](./requirements.md) |
| Prefix | `MWER` |
| Status | approved |
| Budget | **4 tasks · ~280 LOC production / ~350 LOC test · ≤ 1 review round** |
| Date | 2026-09-15 |

## 2. Executive Summary

Add **Angular CDK Drag-Drop** to the My work **Editing** column only. A new **`MyWorkEditingOrderService`** (page-scoped, provided on `MyWorkBoardComponent`) persists ordered result **codes** in `localStorage`. The pure function **`applyManualEditingOrder`** merges saved codes with API rows after `orderEditing()`. `MyWorkBoardService.columns()` applies the merge for the editing bucket when `reorderEnabled()` is true.

No server changes. Supersedes the archived My work non-goal of zero drag — **in-column reorder only**.

## 3. Architecture Overview

### 3.1 Where this lives

| Layer | Touchpoints |
|---|---|
| **Client — view-model** | `my-work.view-model.ts` — `applyManualEditingOrder`, optional export of merge types |
| **Client — service** | `services/my-work-editing-order.service.ts` (new), `my-work-board.service.ts` (columns pipeline) |
| **Client — UI** | `my-work-column`, `my-work-card`, `my-work-board.component` (reorderEnabled, reset emit) |
| **Client — copy** | `my-work-editing-reorder.copy.ts` (new, colocated under my-work-board or internationalization) |
| **Server** | none |

### 3.2 Primary sequence — reorder

```text
[User drags handle on card code 9176]
  │
  ├─ cdkDropListDropped in MyWorkColumnComponent (editing only)
  ├─ MyWorkEditingOrderService.moveItem(previousIndex, currentIndex)
  │     └─ updates signal orderedCodes + localStorage.setItem(key, JSON)
  │
  └─ MyWorkBoardService.columns() recomputes
        └─ editing rows = applyManualEditingOrder(orderEditing(rows), orderedCodes())
```

### 3.3 Primary sequence — load

```text
[MyWorkBoardComponent load completes]
  │
  ├─ MyWorkEditingOrderService.loadForKey(userId, programme, phase)
  ├─ prune codes not in current editing bucket (optional on load)
  └─ columns() merges as above
```

## 4. Data Model

No database changes. Client-only persistence:

| Field | Storage | Shape |
|---|---|---|
| Manual order | `localStorage` | `string[]` of `ProgrammeResultRow.code` (numeric codes as strings) |
| Key | `prms.mwb.editing-order.v1::{userId}::{programmeCode}::{phaseLabel}` | phaseLabel = effective phase label from board |

Version suffix `v1` allows future format changes without corrupt reads.

## 5. API Design

None (v1).

## 6. Frontend / UX Component Architecture

### 6.1 `MyWorkEditingOrderService` (new, page-scoped)

| Responsibility | Detail |
|---|---|
| `orderedCodes` | `signal<string[]>` — current manual sequence |
| `hasManualOrder` | `computed(() => orderedCodes().length > 0)` |
| `loadForKey(userId, programme, phase)` | read + parse JSON; try/catch → `[]` |
| `save(codes)` | write storage; update signal |
| `clear()` | remove key; reset signal |
| `moveItem(prev, curr)` | reorder array + save |
| `pruneToExisting(codesInView)` | drop stale codes from saved list |

Inject `ApiService` or auth user id source consistent with board (same as createdBy filter user).

### 6.2 View-model merge

`applyManualEditingOrder(rows, savedCodes)`:

1. Build `Map<code, row>` from `rows`
2. Emit rows for each `code` in `savedCodes` that still exists in map (preserve saved order)
3. Collect remaining rows → sort with `orderEditing()` → append

Does not mutate inputs.

### 6.3 `MyWorkBoardService` changes

After `groupByColumn(visibleRows())`, map columns: if `key === 'editing'` and reorder enabled, replace `rows` with merged list.

`reorderEnabled` input from board: `scope() === 'mine' && !isNarrowViewport()`.

Alternatively expose `editingRows()` computed to avoid mutating `groupByColumn` output in two places — prefer **post-process in `columns()` computed** to keep `groupByColumn` pure for tests.

### 6.4 `MyWorkColumnComponent`

| Input | Purpose |
|---|---|
| `reorderable` | true only for editing + enabled context |
| `hasManualOrder` | show reset button |
| `manualOrderReset` | output when reset clicked |

Template (non-rail expanded column):

- Wrap list in `cdkDropList` with `cdkDropListOrientation="vertical"`
- Add `cdkScrollable` on scroll container (`custom_scroll` div)
- `(cdkDropListDropped)` → emit indices to parent or call injected order service

Header: text button **Reset to default order** when `hasManualOrder && reorderable`.

### 6.5 `MyWorkCardComponent`

| Input | `reorderable` |
|---|---|
| When true | render handle (`material-icons-round` `drag_indicator`) with `cdkDragHandle` |
| Root | `cdkDrag` with `cdkDragDisabled="!reorderable"` |
| CSS | `.cdk-drag-preview` / `.cdk-drag-placeholder` tokens; disable hover lift while dragging (`cdk-drag-dragging` on host) |

Handle placement: left of code row or dedicated 24px column — must not overlap ⋮ menu (top-right).

### 6.6 `MyWorkBoardComponent`

- Provide `MyWorkEditingOrderService` in `providers` array alongside `MyWorkBoardService`
- On `load()` success + phase/programme change: `orderService.loadForKey(...)`
- On scope switch to `all`: skip merge (reorderEnabled false); no clear of storage
- On programme route param change: load new key
- Wire `MY_WORK_NARROW_QUERY` match to disable reorder (existing breakpoint constant)
- Pass `[reorderable]` and reset handler to Editing column only

### 6.7 Copy (`my-work-editing-reorder.copy.ts`)

- `dragHandleLabel`: "Drag to reorder"
- `resetOrderLabel`: "Reset to default order"
- `personalOrderHint` (optional footer): "Personal order saved on this device"

## 7. Shared Contracts

No package/API extensions.

## 8. Design Decisions

### `MWER-DD-1` — localStorage MVP (not server)

- **Context:** User wants priority queue; cross-device sync not requested.
- **Decision:** Browser `localStorage` per `(user, programme, phase)`.
- **Alternatives:** (A) session-only — rejected (F5 frustration). (B) API + column on result — rejected v1 cost.
- **Consequences:** Order does not follow user across browsers; document in copy.

### `MWER-DD-2` — CDK Drag-Drop (not SortableJS)

- **Context:** `@angular/cdk` already in monorepo; one precedent (`result-metadata-window` free drag).
- **Decision:** `DragDropModule` list reorder with `cdkDragHandle`.
- **Alternatives:** SortableJS — rejected (new dependency).
- **Consequences:** Must configure scrollable parent for long Editing lists.

### `MWER-DD-3` — Merge after `orderEditing()`, not replace

- **Context:** New cards should use sensible default among themselves while respecting manual block.
- **Decision:** `applyManualEditingOrder(orderEditing(rows), savedCodes)`.
- **Alternatives:** Pure manual only — rejected (new cards would appear random).
- **Consequences:** Tail order still completeness-driven.

### `MWER-DD-4` — Reversion challenge (archived MWB non-goal)

- **Reverted behavior:** archived proposal §6 "Drag-and-drop or any status change from the board."
- **Challenge:** What breaks if we allow drag?
  - **Answer:** Only the **negative** Cypress/Jest assertions and submitter expectation of a read-only board. Mitigation: scoped to Editing + handle-only; status still immutable; tests updated narrowly. **No breakage** to Continue navigation if handle is isolated (`MWER-R-1` scenario).

### `MWER-DD-5` — Disable DnD below 900px

- **Context:** `MY_WORK_NARROW_QUERY` — board is horizontal snap strip; drag fights swipe.
- **Decision:** `reorderEnabled = mine && !narrow`.
- **Alternatives:** Long-press DnD — rejected v1 complexity.

## 9. Risks & Rollback

| Risk | Mitigation |
|---|---|
| localStorage blocked | try/catch; fail open |
| CDK + nested scroll | `cdkScrollable` on column list |
| Accidental drag on click | handle-only |
| Rollback | Remove service + CDK imports; delete storage key usage; restore MWB negative tests |

## 10. Test Plan (design-level)

| ID | Covers |
|---|---|
| MWER-TEST-1 | `applyManualEditingOrder` merge + append |
| MWER-TEST-2 | Order service localStorage round-trip (mock Storage) |
| MWER-TEST-3 | Column drop handler index math |
| MWER-TEST-4 | Board — Editing has handle when mine+desktop; pending does not |
| MWER-TEST-5 | Cypress — reorderable context negative/positive (update MWB-TEST-6) |

## 11. Harness Gaps (explicit)

| Property | Gap | Substitute |
|---|---|---|
| Drag feel in scroll column | jsdom cannot simulate drag | HITL 8+ cards |
| F5 persistence | Jest mocks storage only | HITL reload |
| axe on grab states | partial automation | HITL axe |
