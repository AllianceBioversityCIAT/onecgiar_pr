# Archive Summary — My work Editing column manual reorder

Submitter users can drag cards within the **Editing** column on **My results** (Mine scope, desktop) to set personal priority; order persists in `localStorage` per user/programme/phase. Three of four tasks shipped; T-4 (Cypress scoped DnD, module doc, HITL checklist) accepted as follow-up.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-editing-reorder` · Prefix `MWER` |
| Type / Depth | Change · Standard · Approval `gated` |
| Branch | `qa-development-2026` (spec branch; default pin `master`) |
| Archive Date | 2026-09-15 |
| Final Status | **Done with accepted follow-up** — 3/4 tasks `[x]`; `MWER-T-4` deferred |

## 2. Original Spec Path

`docs/specs/changes/my-work-editing-reorder/` (proposal, requirements, design, tasks, execution).

## 3. Archive Date

2026-09-15

## 4. Final Status

| Task | Status | Attempts |
|---|---|---|
| MWER-T-1 merge + order service | PASS | 1 |
| MWER-T-2 CDK column/card | PASS | 1 |
| MWER-T-3 board integration | PASS | 1 |
| MWER-T-4 tests/docs/HITL | **DEFERRED** | — |

Post-ship fix (same commit family): `MyWorkEditingOrderService.loadForKey` / `save` no-op when codes unchanged — prevents an effect loop that left the board on skeleton forever (`?tocView=aows&phase=36` repro).

## 5. Requirements Delivered

| ID | Status |
|---|---|
| MWER-R-1 drag handle (Editing, Mine, ≥900px) | Delivered |
| MWER-R-2 merge / append / prune | Delivered |
| MWER-R-3 default `orderEditing()` when no manual order | Delivered |
| MWER-R-4 no drag outside reorderable context | Delivered (Jest); Cypress scoped update deferred T-4 |
| MWER-R-5 reset to default order | Delivered |
| MWER-R-6 storage key scope | Delivered |
| MWER-R-7 MWB-R-6 narrowed | Delivered in Jest; global Cypress negative → scoped helper deferred T-4 |
| MWER-AC-1…AC-6 | AC-1/3/6 Jest + manual; AC-1 F5 / AC-5 375px / axe HITL deferred T-4 |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Spec | `docs/specs/changes/my-work-editing-reorder/*` |
| View-model | `my-work.view-model.ts` (+spec) — `applyManualEditingOrder` |
| Order service | `services/my-work-editing-order.service.ts` (+spec) |
| Board service | `services/my-work-board.service.ts` (+spec) — columns merge |
| Column / card | `components/my-work-column/*`, `components/my-work-card/*` |
| Board shell | `my-work-board.component.ts/html` (+spec), `my-work-editing-reorder.copy.ts` |
| Styles | `src/styles/my-work-drag.scss`, `styles.scss` import |

Commit: `c5690ca30` — `✨ feat(my-work-board) [MWER]: manual Editing column reorder with Jira-like drag UX`

## 7. Test Evidence Summary

| Suite | Result |
|---|---|
| `my-work.view-model.spec` | PASS |
| `my-work-editing-order.service.spec` | PASS |
| `my-work-board.service.spec` | PASS |
| `my-work-column.component.spec` | PASS |
| `my-work-card.component.spec` | PASS |
| `my-work-board.component.spec` | PASS |
| **Scoped total (archive run)** | **6 suites / 173 tests PASS** |

`test-report.md` / `validation-report.md` not authored — evidence in `execution.md` and scoped Jest above; absence accepted.

## 8. Validation Summary

No `/akili-validate` run. Leader spec audit substituted Reviewer (subagent unavailable). All executed tasks PASS on first attempt.

## 9. Accepted Warnings Or Follow-Ups

| ID | Item |
|---|---|
| **MWER-PA-1** | `MWER-T-4`: update `my-work-board.cy.ts` scoped DnD helper; add `my-work-board/CLAUDE.md` manual-order section; HITL F5 persistence, 8+ card scroll drag, axe on handle |
| **MWER-PA-2** | Server persistence (v2) — `MWER-OQ-2` deferred |
| **MWER-PA-3** | Kaizen pending items on spec branch await default-branch apply |

## 10. Historical Notes

- Parent: archived `changes/my-work-board` (MWB-R-5 default sort, MWB-R-6 no-drag — **modified** for Editing-only handle drag).
- Subagent spawn unavailable for T-1/T-2/T-3; Leader-inline implementation with Leader spec audit recorded in `execution.md`.
- Jira-like drag polish (compact preview, placeholder, `my-work-drag.scss`) shipped in the same feature commit.
