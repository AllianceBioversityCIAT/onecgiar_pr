# Proposal: My work — manual reorder in Editing column (localStorage MVP)

**One line:** let submitters drag cards within the **Editing** column on the My results board to set their own work priority, persisting order per user/program/phase in `localStorage` — without changing result status or adding server APIs in v1.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/my-work-editing-reorder` |
| Proposal Path | `docs/specs/changes/my-work-editing-reorder/proposal.md` |
| Slug | `my-work-editing-reorder` — derived from user request (drag-and-drop sort in Editing status on My results tab) |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | archived `docs/specs/archive/2026-09-05-changes--my-work-board/` |
| Depends on | shipped My work board (`my-work-board`, `MyWorkBoardService`, `orderEditing`) |
| Parallel-safe | yes — client-only; touches Editing column + view-model ordering only |
| Author | Juan Cadavid + Claude (AKILI T1) |
| Date | 2026-09-15 |
| Status | approved — specify complete 2026-09-15 |

Constitution cited: `docs/prd.md` persona *Result submitter*, `G1` (`M1.3` — reduce time-to-submit) · `docs/ux-ui/design.md` §5 SP navigation, §7 status tokens · `docs/trd/trd.md` `W1` (no API change in v1).

## 2. Intent

Submitter users on **My results** (`entity-details/:entityId/my-work`) want to **prioritize their Editing queue** — e.g. finish result 9176 before 9177 — instead of accepting the automatic sort (least complete first, then newest). Drag-and-drop within the Editing column is the requested interaction; v1 persists locally so the order survives refresh on the same browser without a migration or new endpoint.

## 3. Problem / Current Behavior

- The My work board groups results by status column (`my-work.view-model.ts` → `groupByColumn`).
- **Editing** order is computed by `orderEditing()`: ascending completeness ratio (incomplete first), tie-break newest `created` first (`MWB-R-5`).
- The original My work spec **explicitly forbade** drag-and-drop (`MWB-R-6`, `proposal.md` §6 Non-Goals, Cypress `assertNoDragAndDrop()`).
- There is **no** user preference field, query param, or API for card order — reload or filter change recomputes from API data.
- User feedback (2026-09-15, SP01 My results, Editing column with 8 cards): automatic order does not match personal priority; they want to move cards manually.

## 4. Proposed Outcome

| Area | Behavior |
|---|---|
| **Where** | **Editing column only** on My results (`column.key === 'editing'`) |
| **Interaction** | Drag handle on each card → reorder within the column list (`cdkDropList` + `cdkDrag`) |
| **What does NOT move** | Cards cannot be dragged to other columns; status still changes only inside result detail / QA |
| **Default order** | When no manual order exists for the scope, keep current `orderEditing()` |
| **Manual order** | After first drag, stored order wins for known result codes; **new** Editing cards (not in saved order) append **after** manually ordered cards, still sorted among themselves by `orderEditing()` |
| **Persistence (v1)** | `localStorage` key `prms.mwb.editing-order.v1::{userId}::{programmeCode}::{phaseLabel}` → JSON array of `result_code` strings |
| **Reset triggers** | Clear saved order when **programme** or **effective phase** changes; **do not** clear on search / category / center / createdBy filter changes (same cards, same priority) |
| **Scope gate** | Reorder enabled only when board scope is **Mine** (`scope === 'mine'`); **All program results** keeps read-only automatic order |
| **Viewport** | DnD **enabled ≥900px** (desktop column layout); **disabled <900px** (horizontal snap strip — drag would fight swipe scroll) |
| **A11y** | Dedicated drag handle with `aria-grabbed`; keyboard reorder via CDK where supported; axe check on Editing column |

## 5. Scope

- **Client**
  - `my-work-column` — wrap Editing list in `cdkDropList`; handle `cdkDropListDropped`
  - `my-work-card` — drag handle + `cdkDrag` / `cdkDragHandle` when `reorderable` input true
  - New `MyWorkEditingOrderService` (or methods on `MyWorkBoardService`) — read/write localStorage, merge with `orderEditing()`
  - `my-work.view-model.ts` — pure `applyManualEditingOrder(rows, orderedCodes)` helper
  - Import `DragDropModule` from `@angular/cdk/drag-drop` (already in monorepo via `@angular/cdk`)
  - i18n/copy: handle tooltip e.g. "Drag to reorder"
- **Tests**
  - Jest: `applyManualEditingOrder`, localStorage merge/reset, drop handler index math
  - Update `my-work-board.component.spec.ts` — replace MWB-R-6 **negative** with **Editing-only positive** assertions
  - Update `my-work-board.cy.ts` — scoped DnD test on desktop width; keep no-DnD assertion on non-Editing columns
- **Docs**
  - Supersedes archived My work non-goal "no drag-and-drop" for Editing column only
  - Update `my-work-board/CLAUDE.md` if present (or programme-results module guide)

## 6. Non-Goals (v1)

- Drag across columns or changing `status_id` from the board
- Server persistence / cross-device sync (deferred to v2 — see OQ-2)
- Reordering Pending, Submitted, In QA, Approved, or Closed columns
- Reordering when scope is **All program results**
- Touch / long-press DnD on mobile (<900px)
- Assignee / shared team queues (still no assignee concept)

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Persona *Result submitter* | Primary — personal priority queue in Editing |
| `onecgiar-pr-client` `my-work-board` | Column, card, board service, view-model |
| `onecgiar-pr-server` | **None in v1** |
| Archived spec | `changes/my-work-board` — **MODIFIED** MWB-R-6 (Editing-only DnD); MWB-R-5 coexistence rule |
| Related | `programme-results-created-by-filter`, smart-navigation My results back-link |

## 8. Visual Reference

- Source: user screenshot (2026-09-15) — SP01 My results, Editing column with knowledge-product cards and Continue actions
- Location: conversation artifact; `/akili-specify` should reference existing card chrome (`my-work-card.component.html`) + add a **left-edge or header drag handle** (⋮⋮) consistent with PRMS iconography (`material-icons-round` `drag_indicator`)
- Notes: suppress card hover lift (`-translate-y`) while `cdk-drag-preview` / dragging; placeholder gap in list during drag

## 9. Requirement Delta Preview

### ADDED Requirements

- **MWER-R-1:** In scope **Mine**, Editing column ≥900px, user can reorder cards via drag handle; order persists in `localStorage` for `(userId, programmeCode, phaseLabel)`.
- **MWER-R-2:** Manual order merges with API rows: saved codes keep relative order; unknown codes append after, ordered by `orderEditing()` among themselves.
- **MWER-R-3:** Drag handle is the only drag surface — Continue, Open, and ⋮ menu remain click-only.
- **MWER-R-4:** Other columns and All scope show zero drag affordance (MWB-R-6 preserved outside Editing).

### MODIFIED Requirements

- **MWB-R-5:** Default Editing sort unchanged when no manual order; manual order overrides default for saved codes.
- **MWB-R-6:** Split — **Editing + Mine + desktop:** drag allowed via handle; **elsewhere:** no drag (existing negative tests narrowed, not removed globally).

### REMOVED Requirements

- Archived proposal non-goal: *"Drag-and-drop or any status change from the board"* — narrowed to allow **in-column reorder only** (status change still out of scope).

## 10. Open Questions

| ID | Question | Default if silent |
|---|---|---|
| **OQ-1** | Reset manual order when user toggles **Mine ↔ All**? | **Yes** — All is read-only lens; clearing avoids stale order when returning to Mine |
| **OQ-2** | v2 server persistence? | Out of scope; record as follow-up if PM wants cross-device |
| **OQ-3** | Show "Reset to default order" control in Editing header? | **Yes** — text button when manual order exists; clears localStorage slice |
| **OQ-4** | Include Draft status (`status_id=8`) cards in same reorder list? | **Yes** — same Editing column bucket today |

## 11. Technical Approach (for `/akili-specify`)

```text
MyWorkBoardService.columns()
  → groupByColumn(visibleRows())
  → for editing column only:
       applyManualEditingOrder(orderEditing(rows), orderService.codes())

MyWorkEditingOrderService
  storageKey(userId, programme, phase) → string[]
  load() / save(codes[]) / clear()

my-work-column (editing + reorderable)
  cdkDropList (cdkScrollable on column scroll container)
  (cdkDropListDropped) → orderService.moveItem(prev, curr)

my-work-card [reorderable]="true"
  cdkDrag [cdkDragDisabled]="!reorderable"
  cdkDragHandle on .mwb-drag-handle only
```

**Estimated depth:** Standard — ~4 tasks, ~250 LOC prod / ~300 LOC test, 1 review round.

## 12. Risks And Mitigations

| Risk | Mitigation |
|---|---|
| CDK drag inside scrollable column | `cdkScrollable` on column list; test with 8+ cards |
| localStorage quota / private mode | try/catch; fail open to `orderEditing()` |
| Filter removes a card from view | Saved order keeps code; reappears in saved position when filter cleared |
| User expects team-wide order | Copy/tooltip: "Your personal order on this device" until v2 API |

## 13. Verification Preview

| Check | Method |
|---|---|
| Reorder persists after F5 | HITL |
| New result appends after manual block | Jest |
| Pending column still has no `[draggable]` | Cypress + Jest |
| <900px no drag handle | Jest viewport + Cypress 375px |
| axe on Editing column with handle | HITL / CT |

## 14. Recommendation

Proceed with **`/akili-specify changes/my-work-editing-reorder`** at **Standard** depth, then **`/akili-execute`** client-only. Ship localStorage MVP first; open v2 API spec only if submitters ask for cross-browser sync.

---

**Next step:** `/akili-specify changes/my-work-editing-reorder` (or approve this proposal and say "go").
