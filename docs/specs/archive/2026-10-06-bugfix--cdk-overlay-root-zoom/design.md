# Design — CDK overlays stay anchored at every text size

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/cdk-overlay-root-zoom` · **Bug · Lite** |
| Requirements | [`requirements.md`](./requirements.md) (approved 2026-10-06) |
| Baseline | `docs/ux-ui/design.md` DD-11 · `onecgiar-pr-client/src/styles.scss` L478-487 · `@angular/cdk` ^21.2.14 overlay · `@spartan-ng/brain` 21.2.16 |

## 2. Executive Summary

Neutralise the root `zoom` on the CDK overlay container so that positions the CDK writes land in real px, and re-apply the zoom at the **pane** so overlay content still scales (DD-11). This is one global stylesheet change. A new Cypress CT spec measures anchoring and scale at forced `--pr-font-scale` values (COZ-R-1/2/4). A manual browser matrix covers dialogs and sheets (COZ-R-3).

## 3. Architecture Overview

| Layer (DOM, top → down) | Today: effective zoom | After |
|---|---|---|
| `html` | *s* | *s* (unchanged, DD-11) |
| `.cdk-overlay-container` (fixed, inset 0) | *s*, inherited | **1** (counter-zoom 1/*s*) |
| connected bounding box / global wrapper (CDK writes `left/top` here, or flex-centres) | *s* → **positions applied twice** (the bug) | 1 → positions applied once ✓ |
| `.cdk-overlay-backdrop` | *s* | 1, still `inset: 0` → full viewport (COZ-R-3) |
| `.cdk-overlay-pane` and its content | *s* | **back to *s*** (re-zoom) → content, pane width/max-width and margins scale as today (COZ-R-2, COZ-R-3) |

Why the fix works: the CDK reads `getBoundingClientRect()`, which returns visual (zoomed) px, and writes those values on elements whose effective zoom is now 1, so they render 1:1. The pane is laid out inside the positioned box, so zooming the pane scales its size and leaves its anchor point alone.

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-client/src/styles.scss` | Two rules next to the DD-11 block, with a comment citing this spec |
| `onecgiar-pr-client/src/app/shared/…/cdk-overlay-root-zoom.cy.ts` (exact folder chosen in T-1; next to `font-scale.service`) | New Cypress CT regression spec |
| `docs/ux-ui/design.md` DD-11 | Amendment, **recorded as pending**, applied on `staging` (shared-file rule) |

## 5–7. Data Model · API · Backend

None.

## 8. Frontend / UX Component Architecture

- **Rule placement:** `styles.scss`, directly after the `:root { … zoom: var(--pr-font-scale, 1) }` block, so both levers sit together.
- **Re-zoom target:** `.cdk-overlay-pane`, not `.cdk-overlay-pane > *` as in the proposal probe.
  - Zooming the pane keeps the CDK pane sizing (`width`, `maxWidth`, `panelClass` widths, global-strategy margins) scaled exactly as today, which closes proposal risk R-1 by construction.
  - The connected anchor point is on the bounding box (zoom 1), so pane zoom does not move it.
  - **Fallback:** if T-1's CT spec shows pane zoom misplacing connected overlays, use `.cdk-overlay-pane > *` (the probe-verified variant) and re-run the COZ-R-3 matrix for R-1. The choice and its evidence are recorded in `execution.md`.
- **Regression spec harness:**
  - Mount a minimal host in Cypress CT that renders a trigger plus a Spartan `hlm-popover` (`align="start"`, `sideOffset` 6, `[attachTo]` = trigger), placed far from the viewport origin. The offset must be big enough that an ×*s* drift reaches tens of px.
  - Set `--pr-font-scale` on `document.documentElement` per case. The global `styles.scss` is already loaded by the CT devServer.
  - Measure trigger and pane rects for each *s* in {0.9, 1, 1.15, 1.3, 1.5}.
  - Exemplar for structure and viewport handling: `program-overview.row-layout.cy.ts`. Root-zoom caveats: `bilateral-review.cy.ts` banner.
- **Manual matrix (COZ-R-3), real app at scale 1 and 1.5:**
  - one `hlm-dialog` (for example the bilateral mark-discontinued dialog)
  - one `hlm-sheet`
  - the topbar Help, Notifications and User menus
  - one `hlm-tooltip`
  - the notifications filter dropdowns

## 9. Shared Contracts

`--pr-font-scale` stays the single lever (DD-11). No new token or variable.

## 10. Design Decisions

| ID | Decision | Rejected alternatives |
|---|---|---|
| COZ-DD-1 | Counter-zoom `.cdk-overlay-container` to 1 and re-zoom `.cdk-overlay-pane` to *s* (COZ-R-1/2/3, NFR-1) | Custom `OverlayContainer` or position strategy dividing by *s*: patches CDK and Spartan brain internals and is fragile across upgrades. `px→rem`: out of scope per DD-11 |
| COZ-DD-2 | Pane-level re-zoom (not child-level) | Child-level `> *`: probe-verified for connected overlays, but leaves pane-level sizes unzoomed, which is risk R-1 for dialogs. Kept as fallback |
| COZ-DD-3 | Regression gate = Cypress CT in real Chromium | Jest/jsdom cannot measure layout. A manual-only check is not repeatable |
| COZ-DD-4 | DD-11 amended on `staging` and recorded pending here | Editing `docs/ux-ui/design.md` on this branch, which the shared-file write discipline forbids |

**Reversion challenge (Step 2.3):** not triggered. No delivered behaviour is removed. Overlay content keeps the DD-11 scale; only the doubled positioning goes away.

**Kaizen:** `changes--aow-identity-column-starvation` noted that "root zoom ×1.2 inflates measurements". This spec therefore states every CT expectation in visual px against the forced scale, never against an assumed zoom of 1.

## 11. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Expected | Value |
|---|---|
| Tasks | **2** (T-1 regression spec red · T-2 fix + green + matrix) |
| LOC | **~130** (CT spec ~100, CSS ~10, docs ~20) |
| Review rounds | **≤ 2 per task** |

This matches Lite. The fix itself is a few lines; the size comes from the verification matrix, which the blast radius requires.
