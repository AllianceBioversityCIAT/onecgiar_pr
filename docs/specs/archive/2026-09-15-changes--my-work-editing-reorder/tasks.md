# Tasks — My work Editing column manual reorder

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-editing-reorder/tasks.md` |
| Requirements | [`requirements.md`](./requirements.md) |
| Design | [`design.md`](./design.md) |
| Prefix | `MWER` |
| Status | shipped (T-4 follow-up deferred) |
| Budget | 4 tasks · ~280 LOC prod / ~350 LOC test |
| Date | 2026-09-15 |

## 2. Pre-Flight Checklist

- requirements.md approved
- design.md approved
- Open questions resolved (OQ-1…OQ-4 in requirements §10)
- Parent My work board shipped
- No server migration

## 3. Task List

### `[x] MWER-T-1` — View-model merge + `MyWorkEditingOrderService`

- **Type:** client
- **Description:** Add pure `applyManualEditingOrder(rows, savedCodes)` to `my-work.view-model.ts`. Create page-scoped `MyWorkEditingOrderService` with storage key builder, load/save/clear/moveItem/prune. Wire `MyWorkBoardService.columns()` to merge editing rows when reorder context applies (post-`groupByColumn`).
- **Implements:** MWER-R-2, MWER-R-3, MWER-R-6; MWER-AC-2
- **Design refs:** §6.1, §6.2, §6.3; MWER-DD-1, MWER-DD-3
- **Files (expected):**
  - `my-work.view-model.ts` + `my-work.view-model.spec.ts`
  - `services/my-work-editing-order.service.ts` + `.spec.ts`
  - `services/my-work-board.service.ts` (+ spec adjustments)
- **Depends on:** —
- **Blocks:** MWER-T-2, MWER-T-3
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="my-work.view-model.spec|my-work-editing-order.service.spec|my-work-board.service.spec"
  ```
  - **Pass when:** merge tests cover saved order, new-card tail, stale prune; storage round-trip with mock `localStorage`; columns() returns merged editing order when enabled.
  - **Disqualifier:** test only asserts function exists without ordering assertions.
  - **Falsifier input:** saved `[B,A]` with rows A,B → must FAIL if output is `[A,B]` by completeness default.

---

### `[x] MWER-T-2` — CDK drag-drop on column + card

- **Type:** client
- **Description:** Import `DragDropModule`. Add `reorderable`, `hasManualOrder`, `manualOrderReset` to `MyWorkColumnComponent` — `cdkDropList` + `cdkScrollable` on list; drop handler calls order service. Add drag handle + `cdkDrag`/`cdkDragHandle` on `MyWorkCardComponent` when `reorderable`; suppress hover lift while dragging. Add SCSS for placeholder/preview using design tokens.
- **Implements:** MWER-R-1 (handle-only), MWER-R-7; MWER-AC-6
- **Design refs:** §6.4, §6.5; MWER-DD-2
- **Files (expected):**
  - `components/my-work-column/*`
  - `components/my-work-card/*`
  - `my-work-editing-reorder.copy.ts` (handle + reset labels)
- **Depends on:** MWER-T-1
- **Blocks:** MWER-T-3
- **Estimate:** M
- **Skills:** `angular-developer`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="my-work-column.component.spec|my-work-card.component.spec"
  ```
  - **Pass when:** handle renders when `reorderable=true`; absent when false; drop emits/reorders via mocked service; no `[draggable="true"]` on card root (CDK uses cdkDrag, not native draggable on body).
  - **Disqualifier:** whole-card drag without handle.
  - **Falsifier input:** click Continue with reorderable true — must still navigate (existing card spec extended).

---

### `[x] MWER-T-3` — Board integration (scope, viewport, reset)

- **Type:** client
- **Description:** Provide `MyWorkEditingOrderService` on `MyWorkBoardComponent`. Compute `reorderEnabled` from `scope === 'mine'` && `!isNarrow` (reuse `MY_WORK_NARROW_QUERY`). Pass props to Editing column only. Load order service on programme/phase load. Wire **Reset to default order** in column header. Add optional subtle hint copy.
- **Implements:** MWER-R-1, MWER-R-4, MWER-R-5, MWER-R-6; MWER-AC-1, MWER-AC-3, MWER-AC-4, MWER-AC-5
- **Design refs:** §6.6; MWER-DD-5
- **Files (expected):**
  - `my-work-board.component.ts/html`
  - `my-work-board.component.spec.ts`
- **Depends on:** MWER-T-2
- **Blocks:** MWER-T-4
- **Estimate:** S
- **Skills:** `angular-developer`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="my-work-board.component.spec"
  ```
  - **Pass when:** Editing column gets `reorderable=true` only for mine+desktop fixture; `all` scope false; reset clears service; narrow viewport false.
  - **Disqualifier:** reorderable true on pending column.
  - **Falsifier input:** scope `all` → must FAIL if `[reorderable]="true"` on editing column.

---

### `MWER-T-4` — Test contract update + docs + HITL checklist

- **Type:** client + docs
- **Description:** Replace global MWB-R-6 negative tests with scoped rules: no drag outside Editing reorderable context; positive drag handle in Editing (mine, desktop). Update `my-work-board.cy.ts` `assertNoDragAndDrop` → scoped helper. Add `my-work-board/CLAUDE.md` section on manual order. Record HITL checklist in execution notes (F5, 8+ cards scroll, axe).
- **Implements:** MWER-R-4, MWER-R-7; NFR a11y; defect-class HITL gaps
- **Design refs:** §10, §11
- **Files (expected):**
  - `my-work-board.component.spec.ts`
  - `my-work-board.cy.ts`
  - `my-work-board/CLAUDE.md` (new or extend parent RFR guide)
- **Depends on:** MWER-T-3
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`, `playwright-cli` (HITL manual)
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="my-work-board.component.spec|my-work.view-model.spec"
  cd onecgiar-pr-client && npx ng lint --quiet
  ```
  - **Pass when:** lint green; scoped specs pass; Cypress CT updated if run in CI for this module.
  - **Disqualifier:** removing all DnD negative tests without scoped replacement.
  - **Falsifier input:** pending column with drag handle in spec DOM → must FAIL.

---

## 4. Dependency Graph

```text
MWER-T-1 (merge + order service)
    └─► MWER-T-2 (CDK column/card)
            └─► MWER-T-3 (board wiring)
                    └─► MWER-T-4 (tests + docs + HITL)
```

## 5. Scenario → Task Matrix

| Clause | Task |
|---|---|
| MWER-R-1 drag + handle-only | T-2, T-3 |
| MWER-R-2 merge / append / prune | T-1 |
| MWER-R-3 default order | T-1 |
| MWER-R-4 no drag elsewhere | T-3, T-4 |
| MWER-R-5 reset control | T-2, T-3 |
| MWER-R-6 storage key / scope | T-1, T-3 |
| MWER-R-7 MWB-R-6 narrow | T-4 |

## 6. PR Strategy

**Single PR (client-only, ~630 LOC total)** — one review surface for DnD + storage.

Test plan in PR description: HITL F5 persistence, axe on Editing, 375px no handle.

## 7. Recommended First Task

**`MWER-T-1`** — unlocks merge logic and storage before UI work.

## 8. Estimated LOC

| Area | Production | Tests |
|---|---|---|
| View-model + order service (T-1) | ~90 | ~120 |
| Column + card CDK (T-2) | ~100 | ~100 |
| Board wiring (T-3) | ~50 | ~80 |
| Tests/docs (T-4) | ~40 | ~50 |
| **Total** | **~280** | **~350** |
