# Requirements — CDK overlays stay anchored at every text size

## 1. Module / Feature

| Field | Value |
|---|---|
| Spec path | `bugfix/cdk-overlay-root-zoom` |
| Type / Depth | **Bug** · **Lite** (Bug Mode) |
| Approval Mode | `gated` |
| Source | [`proposal.md`](./proposal.md) §9 Bug Diagnosis (confirmed root cause, live probe) — approved 2026-10-06 |
| Baseline | `docs/ux-ui/design.md` §10 text-size control, **DD-11** (root `zoom`) · `onecgiar-pr-client/src/styles.scss` L478-487 |
| Prefix | `COZ` |

**In one line:** when the user's text size ≠ Default, every overlay attached to a trigger must still open next to that trigger, at the size the text-size setting asks for.

## 2. Context

`html { zoom: var(--pr-font-scale) }` also zooms the CDK overlay container. The CDK measures the trigger in zoomed px and writes that position inside the zoomed tree, so it is applied twice. At 1.15, overlays land about ×1.15 away from the viewport origin. At 1 they are exact. See proposal §9.

## 3. In Scope / Out of Scope

| In | Out |
|---|---|
| Position and size of every CDK overlay (connected and global) at scales 0.9 / 1 / 1.15 / 1.3 / 1.5 | Replacing root `zoom` (`px→rem`), which DD-11 defers |
| DD-11 wording amendment (pending, on `staging`) | Native browser zoom; `program-overview`'s missing `attachTo`; PrimeNG |

## 4. Personas Affected

Users who enlarge or shrink text (WCAG 2.2 §1.4.4 audience): every role, on every page that has dropdowns or menus.

## 6. Functional Requirements

### COZ-R-1 — Anchored overlays keep their designed offset at every scale (MUST)

The system SHALL render every overlay that is attached to a trigger at its designed offset from that trigger, whatever the text size.

#### Scenario COZ-R-1.S1 — The reported case (regression)
- GIVEN the text size is **Large** (scale 1.15)
- WHEN the user opens a filter dropdown or a topbar menu
- THEN its leading edge is aligned with the trigger, within 1 px for start-aligned overlays (dx 0)
- AND its top is the designed offset below the trigger bottom, within 1 px (for example 6 px for the filter dropdowns)
- BUT it must NOT be offset in proportion to the trigger's distance from the viewport origin (today: dx 112 / dy 61 on Funding)

#### Scenario COZ-R-1.S2 — Every scale step
- GIVEN any scale in {0.9, 1, 1.15, 1.3, 1.5}
- WHEN an anchored overlay opens
- THEN COZ-R-1.S1's alignment holds
- AND IT MUST flip to the opposite side, still aligned, only when the preferred side has no room. That is CDK fallback behaviour, not drift.

### COZ-R-2 — Overlay content still scales with the text size (MUST)

The system SHALL keep enlarging or shrinking overlay **content** by the text-size factor (DD-11 intent).

#### Scenario COZ-R-2.S1
- GIVEN scale *s* ≠ 1
- WHEN an overlay opens
- THEN its rendered width is the scale-1 width × *s*, within 2 %
- BUT the fix must NOT achieve anchoring by un-scaling the content

### COZ-R-3 — Centred overlays are unaffected (MUST)

#### Scenario COZ-R-3.S1
- GIVEN any scale in {1, 1.5}
- WHEN a dialog or sheet opens
- THEN it is centred (dialog) or edge-docked (sheet) as today, its content is scaled per COZ-R-2, and it fits inside the viewport with no clipping that does not happen at the same scale today
- AND IT MUST keep the backdrop covering the full viewport and closing on click where it does today

### COZ-R-4 — No change at Default (MUST)

#### Scenario COZ-R-4.S1
- GIVEN scale 1
- WHEN any overlay opens
- THEN its position and size match today's (±1 px)

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| COZ-NFR-1 | The fix lives in one place (global stylesheet). No per-consumer edits and no CDK or Spartan patching |
| COZ-NFR-2 | a11y unchanged: focus restore, Escape and outside-click behave as today |

## 8. Acceptance Criteria — defect classes → gate

| Defect class | Caught by |
|---|---|
| Anchored overlay drifts at scale ≠ 1 (the bug) | **Cypress CT regression spec**: real Chromium layout at forced `--pr-font-scale`, measuring rects. Red on current code, green after |
| Content no longer scaled | Same CT spec: width ratio vs scale 1 |
| Dialog/sheet overflow, mis-centring or backdrop gap | **Manual browser matrix** at scale 1 and 1.5 on the real app (no automated check exists; recorded in `execution.md`) |
| Regression at scale 1 | CT spec case at scale 1, plus the manual matrix |
| jsdom/Jest | **Cannot measure layout**, so it is not a gate for any class here (accepted; Jest is not used) |

## 9. Dependencies & Assumptions

- Chromium with standardized CSS `zoom` (Chrome ≥128), as used by the team and Cypress. **Assumption:** other engines are not in the supported matrix. If Safari/Firefox were required, the fix would need re-verification.
- `cypress.config` CT loads `src/styles.scss`, so the root-zoom rule is live in the CT harness.

## 10. Open Questions

None blocking. OQ-1 and OQ-2 in the proposal are resolved: Small (0.9) is included, and BELL will be told when this ships.

## Requirement ID Index

COZ-R-1 (S1, S2) · COZ-R-2 (S1) · COZ-R-3 (S1) · COZ-R-4 (S1) · COZ-NFR-1 · COZ-NFR-2
