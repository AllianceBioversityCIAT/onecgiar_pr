# Kaizen Entry — bugfix/cdk-overlay-root-zoom

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/cdk-overlay-root-zoom` |
| Date | 2026-10-06 |
| Branch | `qa-development-2026-ss`, a spec branch (≠ pin `master`). Every shared-file edit is recorded as pending; nothing is applied |
| Archive Run | 1 |
| Approval Mode | gated |
| Archive | `docs/specs/archive/2026-10-06-bugfix--cdk-overlay-root-zoom/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (COZ-T-1, COZ-T-2) | tasks.md |
| Reviewer FAIL rework attempts | 1 (COZ-T-2 attempt 1: manual-matrix evidence gaps, no code defect) | execution.md — COZ-T-2 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0. The designed pane-level rule (COZ-DD-1) failed in CT, and the pre-planned fallback (COZ-DD-2) shipped without a Pivot Record | execution.md — COZ-T-2-D1 |
| PRODUCT_BUGs | 0 | — |
| Judgment-day severe findings | not run | design.md |
| Validation FAIL / WARN | not run | — |
| Budget | 2/2 tasks · ~137 vs ~130 LOC · rounds T-1 1, T-2 2 (≤2) | design.md §11, execution.md Summary |

## Lessons

- **KZ-bugfix--cdk-overlay-root-zoom-1 — Manual-matrix rows named overlay *types* but not concrete instances with a way to reach them, so the Implementer substituted the wrong instance and declared the right one unreachable.** (Product + Methodology, Medium)
  - **Root cause:** the T-2 matrix said "one `hlm-dialog`: centred" and "one `hlm-tooltip`", without naming which instance or how to open it.
    - Design §8 gave one example (the bilateral mark-discontinued dialog), but nobody checked at specify time that it was centred and reachable.
    - The Implementer tested a right-docked `HlmDialogService` drawer instead and reported "no centred `hlm-dialog` reachable". The global search palette is centred and opens from every page.
    - The tooltip row was skipped for the same reason.
    - One full Reviewer round was spent on evidence that a specify-time pointer would have provided.
  - **Evidence:** execution.md — COZ-T-2 attempt 1, Reviewer issues 1 and 3 (Violated Rule: tasks.md COZ-T-2 manual matrix; design.md §8 Fallback).
  - **Standardization:** → P2 (local template) + upstream recommendation (P3).

## Noted, not a lesson

- **`tasks.md` contradicted itself on the dy expectation** ("6 × s" vs "sideOffset … must not be zoomed"). T-1 resolved it with a recorded decision, so it cost no rework. It feeds the recurrence check for "specify-time self-contradiction".
- **Design primary vs fallback:** the primary (pane-level zoom) was wrong because the CDK writes the connected offset as a pane transform/margin. The pre-planned fallback absorbed it at zero rework. This is a positive signal: naming a fallback plus the test that decides it paid off.
- **`npx eslint <file>` does not work in the client** (no flat `eslint.config.js`). The scoped equivalent is `npx ng lint --quiet --lint-file-patterns <file>`. This is operator tooling knowledge, not a shared-file rule yet.
- **Chrome-tool limits for manual matrices:** `resize_window` does not change `innerWidth`; synthetic hover does not trigger `hlmTooltip`, while a real pointer hover does; Ctrl+K did not fire from the tool. Recurrence feed only.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` → DD-11 (append after its rationale) |
| Edit | **CDK overlays (bugfix/cdk-overlay-root-zoom, 2026-10-06):** root `zoom` must not apply to the CDK overlay positioning space. The CDK measures triggers in visual px and would otherwise apply positions twice. `styles.scss` sets `.cdk-overlay-container { zoom: 1 / s }` and re-applies `zoom: s` to `.cdk-overlay-pane > *`: the content, not the pane, because the pane carries the connected offset. Any new global overlay rule must preserve this pair. |
| Severity | Medium |
| Status | applied (2026-10-06, `866a30b2b` on `staging`) |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` (manual-verification / matrix guidance) |
| Edit | Each manual-matrix row names one concrete instance and how to reach it (route + trigger, e.g. "global search palette — topbar Search / Ctrl+K"), checked reachable at specify time; a row naming only a component type is incomplete. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization (methodology upstream) |
| Target | AKILI methodology repo → `/akili-specify` tasks template, Verification section |
| Edit | Same rule as P2, generalized: manual verification rows must name a concrete, reachable instance plus its access path, not only a component type. |
| Severity | Medium |
| Status | pending (recommend upstreaming) |
