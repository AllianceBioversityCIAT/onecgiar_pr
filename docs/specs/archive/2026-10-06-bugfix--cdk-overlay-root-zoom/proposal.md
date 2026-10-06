# Proposal — CDK connected overlays drift when the text size is not Default

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/cdk-overlay-root-zoom` |
| Slug | `cdk-overlay-root-zoom` — derived from the free-text argument |
| Type | **Bug** |
| Approval Mode | `gated` |
| Owner / driver | Santiago Sanchez |
| Date | 2026-10-06 |
| Origin | Found during `notifications/filter-toolbar-dropdowns` FTD-T-3 (root cause 2). The user chose a separate change. Evidence: that spec's `execution.md` → "FTD-T-3 reopened — dropdown positioning" |
| Requirement source | In-session diagnosis plus two user screenshots. No Jira ticket |
| Baseline consulted | `docs/ux-ui/design.md` §10 (text-size control) and **DD-11** (root `zoom`); `onecgiar-pr-client/src/styles.scss` L478-487; `FontScaleService` |
| Depends on | none · **Parallel-safe:** yes (global stylesheet only; no API, migration or shared TS symbol) |

## 2. Intent

When a user picks a text size other than Default, every anchored overlay (a dropdown, menu or popover attached to a button) should still open right next to its trigger, at every text size.

## 3. Problem / Current Behavior

With text size **Large / Larger / Largest / Small**, anchored overlays open away from their trigger. The offset grows the further right and lower the trigger sits. At the larger sizes some overlays flip or land partly off-screen. At **Default** everything is exact.

DD-11 says root `zoom` "scales … CDK overlays/dialogs uniformly". That holds for the overlay's **size**, but not for the **position** of overlays anchored to a trigger.

## 4. Proposed Outcome

At every text size (0.9 / 1 / 1.15 / 1.3 / 1.5):
- each anchored overlay keeps its designed offset from its trigger (for example, filter dropdowns sit flush left and 6 px below);
- overlay content is still scaled by the text-size factor, as DD-11 intends;
- centred overlays (dialogs, sheets) stay centred and scaled.

## 5. Scope

- The global CSS for the CDK overlay container in `styles.scss`, next to the DD-11 root-zoom rule.
- An amendment to DD-11 in `docs/ux-ui/design.md`, done on `staging` per the shared-file rule: zoom scales overlay size, and position is compensated at the container.
- Verification of every CDK overlay family in the app at all 5 scales:
  - connected: Spartan `hlm-popover` (4 consumers), `hlm-tooltip`, raw `cdkConnectedOverlay` (10 files, including the shell topbar's Help / Notifications / User menus);
  - global: `hlm-dialog` / `BrnDialog` (16), `hlm-sheet` (3).

## 6. Non-Goals

- Replacing root `zoom` with a `px→rem` migration. DD-11 already defers that.
- Changing native browser zoom behaviour. Browser zoom does not cause this; measured with the tab at 100 %.
- Fixing `program-overview`'s missing `attachTo`. That is a separate anchoring defect, recorded in the FTD log.
- PrimeNG overlays. No PrimeNG overlay component was found in the templates.

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Users with a non-Default text size (WCAG 1.4.4 audience: low vision) | Every anchored dropdown and menu opens in the wrong place |
| Shell topbar (Help, Notifications bell, User menu) | Offset from their triggers at ≠1. The **bell quick inbox** (`notifications/bell-quick-inbox`) inherits this |
| Notifications filter toolbar (`notifications/filter-toolbar-dropdowns`) | 7 facet dropdowns. This is where the bug was found |
| Dashboard-lab, bilateral, programme-results, my-work-board overlays | Same mechanism (`cdkConnectedOverlay` / `hlm-popover`) |
| `docs/ux-ui/design.md` DD-11 | Its claim needs a precise amendment |

## 8. Visual Reference

- Source: none needed. This is a positioning fix with no new UI.
- Evidence: two user screenshots from 2026-10-06 (Result type and Funding dropdowns opened down and to the right of their triggers at text size Large).

## 9. Bug Diagnosis

### Observed Symptom
At text size Large, the Funding dropdown opens about 112 px right and 61 px below where it should. The topbar menus are also offset. At Default they are exact.

### Reproduction Steps
1. Log in, open the text-size control in the topbar, and choose **Large**.
2. Go to `/result/results-outlet/results-notifications`.
3. Click **Funding** (or Bilateral project, or the Help / User menu).
4. **Expected:** the overlay sits under its trigger (dx 0, dy = sideOffset). **Actual:** offset by about ×1.15 from the viewport origin.

### Root Cause (confirmed)
- `html { zoom: var(--pr-font-scale) }` (`styles.scss` L486-487) also zooms `.cdk-overlay-container`, which lives inside `html`.
- The CDK `FlexibleConnectedPositionStrategy` reads the trigger with `getBoundingClientRect()`. Under standardized CSS zoom, that rect is already in zoomed (visual) px. The CDK then writes it as `left/top` CSS lengths **inside the zoomed tree**, so the browser zooms them a second time.
- Net effect: the rendered position is about the trigger position × scale.
- Measured live on vw 1536, Funding at 1.15: trigger L697 B352, content L809 T413. The ratios (×1.161, ×1.154) match the scale. At scale 1 the position is exact.
- The offset is proportional to the distance from the origin, and dx/dy grow with the scale.

| Overlay (BEFORE) | 0.9 | 1 | 1.15 | 1.3 | 1.5 |
|---|---|---|---|---|---|
| Filter `phase` (dx/dy) | off | 0 / 6 | 54 / 60 | 120 / flipped | 231 / flipped |
| Topbar Help (dx/dy) | — | 0 / 8 | 164 / 25 | 313 / 53 | 485 / 106 |

### Impact & Scope
- **Every connected CDK overlay app-wide**, for any user not on Default.
- No data, security or API impact. This is a pure rendering defect on an accessibility feature: the users who enlarge text get broken menus.
- Global (centred) overlays are not offset, because flex centring uses no measured coordinates. They are still at risk from any fix that touches the container.

### Fix Strategy
Compensate at the container rather than in every consumer:

```css
.cdk-overlay-container { zoom: calc(1 / var(--pr-font-scale, 1)); }   /* positions in real px */
.cdk-overlay-pane > *  { zoom: var(--pr-font-scale, 1); }              /* content still scaled (DD-11) */
```

> **Superseded in design (COZ-DD-2, 2026-10-06):** the spec re-zooms `.cdk-overlay-pane` itself, not `> *`, so pane-level sizing keeps scaling as today (closes R-1). The child-level rule above was the probe variant and stays as the fallback.


**Live probe (injected style, same page, all 5 scales):** every connected overlay snapped to its trigger.
- Filter dropdowns: dx 0 / dy 6 at every scale. At 1.3/1.5 they correctly flip above when the viewport is short.
- Help menu: dx 0 / dy 8 at every scale.
- Notifications and User menu: end-aligned, with a consistent dy of 8.
- Content stayed scaled: dropdown width 234 → 390 px from 0.9 → 1.5.

Route: `/akili-specify bugfix/cdk-overlay-root-zoom` in **Bug Mode**, Lite depth. It is a few CSS lines, but its blast radius is the whole app, so it needs a regression check and a per-family verification matrix, not `/akili-quick`.

## 10. Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | Counter-zoom `.cdk-overlay-container`, re-apply zoom on `.cdk-overlay-pane > *` (global CSS) | One place; covers every CDK consumer, including future ones; probe-verified for connected overlays | Pane-level sizing (`panelClass` widths, CDK `maxWidth`/`maxHeight` on the pane, `vw/vh` inside panes) becomes unzoomed, so dialogs and sheets must be checked for size and overflow; backdrops must still cover the viewport |
| B | Custom `OverlayContainer` / position strategy that divides by the scale factor | Precise; no CSS zoom interplay | Patches CDK internals; must wrap Spartan's brain position builder too; harder to maintain across CDK upgrades |
| C | Drop root `zoom` for a `px→rem` migration | Removes the class of bug entirely | Huge (200+ px sites); DD-11 explicitly defers it; months, not a bugfix |

## 11. Recommended Approach

**Option A.** It is the smallest safe path: global CSS only, no TS, no CDK patching, and it fixes every consumer at once. The live probe already shows correct anchoring at all 5 scales. The remaining risk is concentrated in global overlays and pane-level sizing, which the spec's verification matrix can bound.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Mitigation / question |
|---|---|---|
| R-1 | Dialogs and sheets set widths or max sizes on the **pane** (`panelClass`, CDK `width`/`maxWidth`). After the fix those are unzoomed while the content is zoomed, so content could overflow its pane | The verification matrix opens every dialog and sheet family at 1 and 1.5. If needed, move the re-zoom from `.cdk-overlay-pane > *` to the pane for global overlays only (`.cdk-global-overlay-wrapper > .cdk-overlay-pane`), keeping connected panes child-zoomed |
| R-2 | `vw`/`vh` units inside a zoomed pane child | Check full-height sheets at 1.5 |
| R-3 | CDK backdrop and scroll-blocking under the counter-zoom | Probe: the backdrop must still cover 100 % and close on click |
| R-4 | Tooltips (`hlm-tooltip`, 1 consumer) and command palettes | Include them in the matrix |
| R-5 | jsdom cannot prove layout | The regression evidence is a browser check (Cypress CT at a forced `--pr-font-scale`, or a recorded Chrome probe); Jest can at most assert the stylesheet rule exists |
| R-6 | Shared-file rule: the DD-11 edit in `docs/ux-ui/design.md` | Record it as pending and apply it on `staging` |
| OQ-1 | Should Small (0.9) stay in the matrix? | Yes. It is the same mechanism in the other direction (measured dx −58 / −132) |
| OQ-2 | Coordinate with `bell-quick-inbox`? | Its bell overlay is affected. Tell that session once this ships; no code dependency |

## 13. Success Criteria

- For every connected overlay family, at 0.9 / 1 / 1.15 / 1.3 / 1.5: |dx − designed| ≤ 1 px and |dy − sideOffset| ≤ 1 px, or a correct flip when there is no room.
- Overlay content is visually scaled by the factor (width ratio within 2 % of the scale).
- Dialogs and sheets stay centred, fully inside the viewport, and scaled, with the backdrop covering the viewport.
- No regression at Default (scale 1): byte-identical positions to today.
- DD-11 amended (pending, on `staging`).

## 14. Next Step

```text
/akili-specify bugfix/cdk-overlay-root-zoom
```

Run it in **Bug Mode**, Lite depth, with a mandatory browser regression check across the 5 scales.
