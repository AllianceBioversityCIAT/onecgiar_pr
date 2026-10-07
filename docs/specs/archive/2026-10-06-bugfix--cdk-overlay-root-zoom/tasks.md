# Tasks — CDK overlays stay anchored at every text size

## 1. Scope of this task list

- **Spec:** `bugfix/cdk-overlay-root-zoom` (Bug · Lite) · [requirements](./requirements.md) · [design](./design.md)
- **Owner:** Santiago Sanchez · **Status:** `ready`
- **Budget (design §11):** 2 tasks · ~130 LOC · ≤2 review rounds per task.

**Test-run rules (every task):**
- Cypress CT only through `npm run test:ct:batch -- --spec <file>` (or `npx cypress run --component --spec <file>`), scoped to this spec's file.
- **Never run it together with Jest**, and only one test run at a time on the machine. Other sessions in this checkout use the "wants Jest / clear / done" handshake; CT counts as a test run.
- Check free RAM before launching (< 4 GB → tell the user).
- Lint only the touched files.
- No commit without the user's explicit go-ahead.

## 2. Pre-flight checklist

- [x] requirements.md approved (2026-10-06)
- [x] design.md approved (2026-10-06, judgment-day not requested)
- [x] `git status` shows that `src/styles.scss` has no uncommitted edits from another session (re-check before T-2)
- [x] The CT harness boots: one existing small CT spec passes on this branch (smoke probe; the CT suite is known to be broadly red on this branch, so a red unrelated spec is not a blocker)

## 3. Task list

### [x] COZ-T-1 — Regression CT spec (red on current code)

- **Type:** test · **Size:** M · **Depends on:** — · **Skills:** `angular-developer`, `spartan`, `tdd`
- **Implements:** COZ-R-1.S1, COZ-R-1.S2, COZ-R-2.S1, COZ-R-4.S1 · design §8 "Regression spec harness", COZ-DD-3
- **Scope:**
  - New `*.cy.ts` next to `src/app/shared/services/font-scale.service.ts`. Exemplar: `program-overview.row-layout.cy.ts`.
  - It mounts a standalone host with a trigger button plus `hlm-popover` (`align="start"`, `sideOffset="6"`, `[attachTo]` = trigger), with the trigger placed at least 400 px right and 300 px down from the viewport origin.
  - For each *s* in {0.9, 1, 1.15, 1.3, 1.5} it sets `--pr-font-scale` on `<html>`, opens the popover and measures:
    - the pane's `left − trigger.left` must be within ±1 px of 0;
    - `pane.top − trigger.bottom` must be within ±1 px of 6 × *s*. The sideOffset is written on the box and must not be zoomed, so the exact expectation is fixed in T-1 by measuring at *s* = 1 and recorded. Either way, it must NOT grow with the trigger's distance from the origin;
    - the pane width must be within 2 % of width(*s*=1) × *s*.
  - Wait for the entry animation to finish (or disable animations) before measuring, so the `zoom-in-95` transition does not skew the rect.
- **Verification:**
  - **Red run (the deliverable):** on current code (no fix), the *s* ≠ 1 cases FAIL with drift roughly proportional to *s*, and the *s* = 1 case PASSES. Paste the failing values into `execution.md`.
  - **Input that would make it fail:** the current `styles.scss` (root zoom with no counter-zoom). If the spec is green before the fix, it is not measuring the bug: stop and report.
  - **Disqualifier:** a spec that leaves the trigger near (0,0) cannot show the drift, because ×*s* of a small number is under 1 px. A spec that measures before the animation ends, or that hard-codes *s* = 1, is not evidence either.
  - **Cannot prove:** dialogs and sheets (COZ-R-3). Those belong to T-2's manual matrix.
- **DoD:**
  - [x] CT spec committed-ready; red at *s* ≠ 1 and green at *s* = 1 on current code; failing values recorded
  - [x] ESLint clean on the new file

### [x] COZ-T-2 — Counter-zoom the overlay container; green regression + manual matrix

- **Type:** fix · **Size:** S · **Depends on:** COZ-T-1 · **Skills:** `tailwind-design-system`, `systematic-debugging`
- **Implements:** COZ-R-1..R-4, COZ-NFR-1, COZ-NFR-2 · design §3, §8, COZ-DD-1/2/4
- **Scope:**
  - In `src/styles.scss`, directly after the DD-11 `:root` zoom block, set the counter-zoom on `.cdk-overlay-container` (1 / `--pr-font-scale`) and the re-zoom on `.cdk-overlay-pane` (`--pr-font-scale`), with a comment citing this spec.
  - If the T-1 spec shows that pane-level re-zoom misplaces connected overlays, switch to the child-level fallback (COZ-DD-2) and record why.
  - Record the DD-11 amendment as **pending** in `execution.md` (apply on `staging`).
- **Verification:**
  - **Green run:** the T-1 spec passes at all 5 scales.
  - **Falsifier:** removing the container counter-zoom turns T-1 red again.
  - **Manual matrix (COZ-R-3, NFR-2):** real app at scale 1 and 1.5, recorded in `execution.md` with rects and screenshots.
    - one `hlm-dialog`: centred, inside the viewport, backdrop covers it and closes on click;
    - one `hlm-sheet`: edge-docked, full height, no clipping;
    - the topbar Help, Notifications and User menus: anchored, with Escape returning focus to the trigger;
    - one `hlm-tooltip`: anchored;
    - the notifications filter dropdowns: dx 0 / dy 6.
    - At scale 1, every row matches today's positions within ±1 px (COZ-R-4).
  - **Disqualifier:** a matrix run on a stale bundle doesn't count; first confirm the new rule is present in the computed style of `.cdk-overlay-container`. A matrix run only at scale 1 also proves nothing.
- **DoD:**
  - [x] T-1 spec green; falsifier recorded
  - [x] Manual matrix recorded at 1 and 1.5; no row worse than today
  - [x] Stylelint/ESLint as applicable on `styles.scss` (no stylelint configured; n/a)
  - [x] DD-11 amendment recorded as pending

## 4. Dependency graph

COZ-T-1 → COZ-T-2. Linear, with no parallelism.

## 5. Test plan

| Layer | Tool | Owns |
|---|---|---|
| Layout regression | Cypress CT (real Chromium) | COZ-R-1.S1/S2, R-2.S1, R-4.S1 |
| Centred overlays, a11y | Manual browser matrix | COZ-R-3.S1, NFR-2 |
| Jest | Not used | jsdom cannot measure layout (accepted, requirements §8) |

## 5A. Scenario / clause coverage

| Clause | Owner |
|---|---|
| R-1.S1 THEN leading edge aligned · AND top at offset · BUT not proportional drift | T-1 (red), T-2 (green) |
| R-1.S2 every scale · AND IT MUST flip only when there is no room | T-1 (5 scales; the host leaves room below, so a flip is a failure) · T-2 matrix (real flips at 1.5 recorded as correct when there is no room) |
| R-2.S1 width × *s* · BUT not by un-scaling | T-1 width assertion |
| R-3.S1 centred/docked, scaled, fits · AND IT MUST keep backdrop | T-2 manual matrix |
| R-4.S1 scale 1 unchanged | T-1 *s* = 1 case · T-2 matrix scale 1 |
| NFR-1 one place | T-2 scope (styles.scss only; Reviewer checks the diff) |
| NFR-2 a11y unchanged | T-2 matrix (Escape/focus) |

## 6. Rollout & verification

- [x] Commit only on the user's go-ahead (a2b8f2d50, 2026-10-06). Subject: `🔧 fix(styles) [SPEC:bugfix/cdk-overlay-root-zoom]: …`, with no apostrophes or quotes (Jenkins)
- [ ] Tell the `bell-quick-inbox` session (its bell overlay is affected)
- [ ] Manual QA on test env at text size Large

## 7. Cleanup & follow-ups

- [ ] Apply the DD-11 amendment on `staging`
- [ ] `program-overview` missing `attachTo`: a separate quick fix (recorded in the FTD log)

## 8. Roll-back plan

Revert the two CSS rules. That restores today's behaviour (correct at Default, drifting otherwise). No data or API impact.
