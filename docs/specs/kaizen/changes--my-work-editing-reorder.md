# Kaizen Entry — changes/my-work-editing-reorder

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-editing-reorder` · Prefix `MWER` |
| Date | 2026-09-15 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |
| Outcome | 3/4 tasks PASS; T-4 deferred; Editing reorder live on `qa-development-2026` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 planned; 3 PASS, 1 deferred | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 0 (Leader spec audit substitute; no FAIL) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 1 post-ship (skeleton loop) — fixed before archive | archive-summary §4; `my-work-editing-order.service.ts` |
| Validation FAIL / WARN | n/a (no `/akili-validate`) | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none | — |
| Subagent availability | Implementer/Reviewer unavailable T-1 — Leader-inline | execution.md |
| Scoped Jest (archive) | 6 suites / 173 PASS | archive run 2026-09-15 |

## Lessons

- **KZ-changes--my-work-editing-reorder-1 — Order-service effects must no-op when `orderedCodes` is unchanged, or sibling prune/load effects can loop and freeze the board on skeleton.** (Product, High)
  - Root cause: `loadForKey()` always called `orderedCodes.set()` even when parsed JSON matched the current signal; the board's load + prune effects re-ran `columns()` → loading pipeline indefinitely on cold open.
  - Evidence: post-ship repro on `my-work?phase=36`; fix `sameCodeSequence` guards in `my-work-editing-order.service.ts` `loadForKey` / `save`; split load vs prune effects in `my-work-board.component.ts`.
  - Standardization: → P1 (module guide) · → P2 (factual note: signal effects that persist client state should compare-before-write).

## Noted, not a lesson

- Leader-inline execution when subagents hit usage limits — recovered cleanly; execution.md records audit substitute.
- `MWER-T-4` (Cypress scoped DnD, CLAUDE.md, HITL) deferred by archive — not a process failure; v1 Jest coverage sufficient for ship.
- Jira-like drag UX polish (preview/placeholder SCSS) added during implementation without scope creep to server/API.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/CLAUDE.md` (create) |
| Edit | Add § Manual Editing reorder: `MyWorkEditingOrderService` (page-scoped), storage key `prms.mwb.editing-order.v1::{userId}::{programme}::{phase}`, `reorderEnabled = mine && !narrow`, handle-only CDK drag; **compare-before-write** on `orderedCodes` to avoid effect loops. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-client/src/AGENTS.md` — My work board bullet (if present) or RFR pages section |
| Edit | Note that My results Editing column supports client-only manual reorder (localStorage) on Mine + desktop; archived MWB-R-6 no-drag rule is narrowed to non-Editing contexts. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` — Frontend / signal effects checklist |
| Edit | Add: "Client `effect()` blocks that write persistence signals must compare-before-write; pair load and prune in separate effects with `untracked()` for side effects that must not become dependencies." |
| Severity | High |
| Status | pending |
