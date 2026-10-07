# Archive Summary — CDK overlays stay anchored at every text size

**Outcome:** shipped. Dropdowns, menus and tooltips now open next to their trigger at every text size, and their content still scales. The fix is two global CSS rules, guarded by a Cypress CT regression spec.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/cdk-overlay-root-zoom/` |
| Archive path | `docs/specs/archive/2026-10-06-bugfix--cdk-overlay-root-zoom/` |
| Archive date | 2026-10-06 |
| Type / depth | Bug · Lite · `gated` |
| Branch | `qa-development-2026-ss` (a spec branch; the pin is `Default Branch: master`) |
| Commit | `a2b8f2d50` 🔧 fix(styles) [SPEC:bugfix/cdk-overlay-root-zoom] |
| Final status | **Complete**: 2/2 tasks `[x]`, both with Reviewer PASS |

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| COZ-R-1.S1/S2 (anchored at every scale) | the CSS rules + the CT spec | CT: dx 0 / dy 6 at 0.9, 1, 1.15, 1.3 and 1.5. Matrix: menus, filters and the tooltip are anchored at 1.5 |
| COZ-R-2.S1 (content still scales) | `.cdk-overlay-pane > *` re-zoom | CT width = 260 × s exactly |
| COZ-R-3.S1 (dialogs and sheets unaffected) | the zoom-1 container | Matrix: palette, sheet and AI-processes dialog are identical to the no-fix emulation |
| COZ-R-4.S1 (no change at Default) | both rules are zoom 1 at s = 1 | CT s = 1 case; matrix rows at s = 1 |
| COZ-NFR-1 (one place) | `styles.scss` only | diff |
| COZ-NFR-2 (a11y unchanged) | — | Escape and focus restore checked on the menus, palette, sheet and dialog |

## Files Changed

| File | Change |
|---|---|
| `onecgiar-pr-client/src/styles.scss` | +15: the counter-zoom on `.cdk-overlay-container` and the re-zoom on `.cdk-overlay-pane > *`, with a spec comment |
| `onecgiar-pr-client/src/app/shared/services/cdk-overlay-root-zoom.cy.ts` | +122: the regression spec, covering 5 scales, rects measured in visual px |

## Test Evidence

| Gate | Result |
|---|---|
| CT red run (T-1, pre-fix) | 4/5 failing; drift up to dx 390 / dy 306 at 1.5 |
| CT green run (T-2) | 5/5 passing |
| Falsifier (container rule removed) | red again, with the exact T-1 values |
| Manual matrix at 1 and 1.5 | complete. See `execution.md` → COZ-T-2 attempt 2 |
| `test-report.md` | **not produced.** Accepted: this is a Lite bug, and the CT spec plus the matrix in `execution.md` are the test evidence |

## Validation

`validation-report.md` was **not produced**. That is accepted for a Lite bug: the Reviewer PASS on each task covered spec conformance, and the user asked to archive right after execution.

## Follow-Ups (accepted, open)

- [ ] Apply the DD-11 amendment to `docs/ux-ui/design.md` on `staging`. The text is in `execution.md` and kaizen pending item P1.
- [ ] Tell the `bell-quick-inbox` session that its bell popup is affected.
- [ ] Manual QA on the test environment at text size Large.
- [ ] `program-overview` is missing `attachTo`: a separate quick fix.
- [ ] Re-index CodeGraph (`codegraph sync`). This is optional, because no module changed.

## Historical Notes

- **Pane-level re-zoom (COZ-DD-1) was disproved by the T-1 spec:** it scaled the 6 px `sideOffset` to 6 × s. The child-level fallback (COZ-DD-2) shipped instead.
- **`tasks.md` contradicted itself on the dy expectation** (6 × s vs "not zoomed"). It was resolved in T-1 as a flat 6 visual px (COZ-T-1-D1), and T-2 confirmed it.
- **Out of scope:** at 1.5 on short viewports, the AI-processes dialog (`h-dvh`) is clipped vertically. The clipping is identical without the fix.
