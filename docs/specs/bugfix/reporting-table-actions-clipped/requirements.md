# Requirements — Reporting Table Actions Clipped (Bug, Lite)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bugfix/reporting-table-actions-clipped` (client) |
| Type | Bug |
| Depth | Lite |
| Status | draft |
| Approval Mode | gated |
| Source | `proposal.md` (same folder) — Bug Diagnosis, root cause confirmed |
| Ticket | — |

## 2. Executive Summary

At viewport widths ≤~1350px, the Reporting tab's grouped indicator rows clip their rightmost action controls (Report/Continue button, Copy-link icon, "···" more-actions menu) instead of scrolling or shrinking. Fix: give the row (and its aligned sub-group header) a horizontal scroll container, mirroring the pattern the "All indicators" flat table already uses successfully in the same component.

## 3. Glossary

| Term | Meaning |
|---|---|
| Grouped view | The default Reporting-tab view: AoW cards → HLO sub-groups → indicator rows (`reporting-aow-table.component.html`, `@else` branch) |
| Flat view / "All indicators" | The alternate sortable table view (`viewMode() === 'flat'`), already horizontally scrollable via `.pr-flat-scroll` |
| Row action controls | Report/Continue button, Copy-link icon, "···" overflow menu on the right of each indicator row |

## 4. System Context & Scope

- **Module touched:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/` (`.html`, `.scss`).
- **Screen/flow:** Reporting tab, grouped (by-AoW) view — `docs/ux-ui/design.md` responsive rule (desktop-first, tablet must work).
- **In scope:** restoring visibility/reachability of the row action controls at narrow viewports, for the grouped-view indicator row (`#indicatorRow` template) and its mirrored sub-group header (`.pr-hlo-head`).
- **Out of scope:** the flat "All indicators" table (already scrolls correctly); any redesign of column widths, action labels, or menu contents; the AoW-card header's own summary stats row (not confirmed affected — tracked as an open question, not fixed here).

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| Result submitter / center focal point reporting KPIs from a laptop-class screen (≤1350px) | Regains access to Report/Continue, Copy-link, and the "···" menu on every row, regardless of window width. |

## 6. Functional Requirements

### Required (MUST)

> **Amended 2026-09-01 (second pivot — user-directed).** RTA-R-1 previously accepted *"visible directly, **or** via horizontal scroll"* and the first implementation took the scroll branch. The user judged scroll-to-reach unacceptable UX for the row's primary controls and directed a **sticky-actions** design. RTA-R-1 below is tightened to require the preferred branch that the original wording already ranked first. Full rationale: `execution.md` → Pivot Record: `RTA-T-1` (second pivot).

- **RTA-R-1** The system MUST keep the Report/Continue button, Copy-link icon, and "···" overflow menu **continuously visible without any scrolling** on every grouped-view indicator row, at any viewport width down to 768px, with the reporting nav sidebar visible. The user MUST NOT have to scroll to reach them. Where the row is too narrow for all content, it is the **data columns** (`Target`, `Achieved`, `Status`, `Progress`) that scroll — the action controls stay pinned.
- **RTA-R-2** The sub-group header (`.pr-hlo-head`) MUST remain visually aligned with the indicator rows it labels at every width covered by RTA-R-1 — including while the data columns are horizontally scrolled. The header's own action/trailing cells MUST pin in step with the row's.
- **RTA-R-3** The fix MUST NOT regress the existing "All indicators" flat table's horizontal scroll behavior.
- **RTA-R-4** *(new, 2026-09-01)* The pinned action region MUST remain **visually opaque** — scrolled data columns MUST NOT show through or underneath it, in **every** row state including `:hover` (the row changes background on hover) and the sub-group header's own background.

#### Scenario: Action controls visible without scrolling at 1350px and below

- GIVEN the Reporting tab is open in the grouped (by-AoW) view with at least one expanded AoW card
- WHEN the browser viewport width is set to 1350px (or any width down to 768px), with the reporting nav sidebar visible
- THEN the "···" more-actions button for each visible indicator row is **visible and clickable immediately, with the row's scroll offset at 0** — no scrolling required
- AND the Report/Continue button and Copy-link icon (when rendered for that row) are likewise immediately visible
- AND they REMAIN visible and clickable after the data columns are scrolled to any offset
- BUT the row's fixed column widths (`Target`, `Achieved`, `Status`, `Progress`) MUST NOT be silently shrunk or reflowed to make this fit
- AND IT MUST NOT introduce a second, redundant horizontal scrollbar for the same visual row (one scroll mechanism per row)

#### Scenario: Sub-group header stays aligned while data columns scroll

- GIVEN a grouped-view AoW card is expanded and its content is scrolled horizontally at ≤1350px
- WHEN the user scrolls the indicator rows horizontally
- THEN the `.pr-hlo-head` column labels stay aligned with the columns they label — the scrolling data labels with the scrolling data columns, and the pinned action label with the pinned action cells
- AND IT MUST behave identically whether the browser is resized live or loaded fresh at a narrow width

#### Scenario: No bleed-through under the pinned actions

- GIVEN a grouped-view indicator row whose data columns are scrolled to a non-zero offset
- WHEN the row is in its default state, AND when it is hovered
- THEN the scrolled data columns MUST NOT be visible through, behind, or underneath the pinned action controls in either state

### Should (SHOULD)

- **RTA-R-10** The scroll affordance for the **data columns** SHOULD remain visually consistent with the existing `.pr-flat-scroll` pattern (no new scrollbar styling introduced). *Amended 2026-09-01: this now governs only the data-column scroller; the pinned action region is a new pattern in this component and is governed by RTA-R-11.*
- **RTA-R-11** *(new, 2026-09-01)* The pinned action region SHOULD carry a subtle left-edge separator (e.g. a `box-shadow`) so it reads as deliberately pinned rather than as content overlapping content.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | The "···" button MUST remain keyboard-reachable (`Tab` order unaffected) at every width in scope; no loss of the existing `aria-expanded`/`aria-label` attributes. |
| Responsive | Behavior MUST hold at 1350px, 1280px, 1024px, and 768px (tablet floor per `src/CLAUDE.md`). |
| Regression | No visual change required above ~1350px viewport width (current desktop layout is not to be touched). |

**Defect classes this spec can produce → verification:**

| Defect class | Caught by |
|---|---|
| Action controls still clipped at ≤1350px (fix incomplete) | Cypress **component** test asserting the "···" button is **visible and clickable at scroll offset 0** — and still so after scrolling — at constrained container widths standing in for 1350/1024/768px (jsdom cannot measure real layout — harness resolved in `design.md` §10, amended 2026-09-01) |
| Actions pinned but **transparent** — data bleeds through when scrolled or hovered (RTA-R-4) | Same CT suite: assert a non-transparent computed `background-color` on the pinned cells in **both** default and `:hover` state. Note a computed-style assertion is weaker than a human eye — the visual confirmation stays a manual check |
| Actions pinned but header labels drift (RTA-R-2 under sticky) | Same CT suite: assert `.pr-hlo-head`'s pinned cells share the row's pinned offset after scrolling |
| `.pr-hlo-head` drifts out of alignment with rows once scrolled | Same test, asserting header and rows share one scroll container (common `offsetParent`), which makes alignment structural. Exact pixel alignment is **not** asserted — accepted gap, human visual check substitutes |
| Regression to the flat table's existing scroll | Existing flat-table tests/manual check must still pass unmodified |
| **Real shell does not actually constrain the container at 1350px viewport** | **Not covered by any automated test — see RTA-GAP-CT below.** Outstanding manual visual check |

Any class without an automated assertion is called out explicitly in `design.md` §10 rather than silently assumed covered.

**RTA-GAP-CT (accepted gap, recorded 2026-09-01 with the harness pivot):** the chosen Cypress component harness mounts `reporting-aow-table` without its real ancestor chain — no reporting page shell, no ~280px reporting nav sidebar. It therefore constrains the **component's container width directly** rather than setting a browser **viewport** width, and does not confirm that the real shell yields a sub-1048px container at a 1350px viewport. This is faithful to the defect, because `design.md` §6.3 establishes the fix is *intrinsic* (it activates whenever available width drops below ~1048px; the 1350px figure is a symptom of one user's sidebar+viewport combination, not a value to hardcode) — CT tests the real trigger rather than the incidental symptom. The viewport→container mapping nonetheless remains an **outstanding manual visual check** at 1350/1024/768px with the sidebar visible, and must be reported as unverified until a human performs it. A green CT run does not close it.

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| RTA-AC-1 | Grouped Reporting view, viewport ≤1350px down to 768px | An AoW card is expanded | The "···" menu, Report/Continue button, and Copy-link icon for each row are **immediately visible and clickable at scroll offset 0** — no scrolling needed — and stay so at any scroll offset |
| RTA-AC-2 | Same as above, data columns scrolled horizontally | User scrolls the row | `.pr-hlo-head` stays aligned: scrolling labels track scrolling columns, pinned action label tracks the pinned cells |
| RTA-AC-3 | Viewport >1350px (e.g. 1440px, 1920px) | Same screen | No visual change from current production behavior — no scrollbar, and the pinned cells indistinguishable from ordinary cells |
| RTA-AC-4 | Row's data columns scrolled to a non-zero offset, default **and** `:hover` state | User inspects the pinned region | No scrolled data column is visible through or underneath the pinned action controls |

## 9. Dependencies & Assumptions

### Upstream dependencies

- None — pure client CSS/markup change in one component.

### Downstream consumers

- None outside `reporting-aow-table` itself; the flat-table view is a sibling, not a consumer.

### Assumptions

- The reporting nav sidebar (~280px) stays at its current width; this fix targets the *card's* available width, not the sidebar. Note this is precisely the assumption RTA-GAP-CT leaves unverified — the CT harness never instantiates the sidebar.
- Real-browser layout is required to verify this bug and its fix — Jest/jsdom cannot compute CSS Grid track widths or `overflow` clipping, so the regression test's harness choice matters (resolved in `design.md` §10; **amended 2026-09-01** from Cypress E2E to Cypress component testing, because `cypress.env.js` is absent by default in this repo and an E2E run would skip rather than assert — full rationale in `execution.md` → Pivot Record: `RTA-T-2`).

## 10. Open Questions

- **RTA-OQ-1** Does the AoW-card header row (Target/Achieved/QA/Prel/ratio bar) also clip at ≤1350px? Not confirmed in the original report. Recommendation: ship this fix scoped to indicator rows + sub-group header first; file a follow-up if QA finds the card header affected too.

## 11. Out-of-Band Notes

- `reporting-aow-table/CLAUDE.md` documents the row grid's fixed track widths as load-bearing (pinned by P2-3296 and MRF-R-3.1/R-5) — this fix must not alter those widths, only how overflow of the whole row is handled. The component's `CLAUDE.md` must be re-stamped in the same commit per `docs/COMPONENT-DOCS.md`.

## Required cross-references

- `docs/ux-ui/design.md` — responsive rule (desktop-first, tablet must work).
- `onecgiar-pr-client/CLAUDE.md` §5 — Tailwind-first styling, SCSS only when necessary (this fix is exactly that case: an `overflow`/scroll wrapper is not cleanly expressible as a template utility next to an existing animation-critical `overflow: hidden`).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` — pinned track widths, disclosure/animation contract.
- `docs/specs/bugfix/reporting-table-actions-clipped/proposal.md` — Bug Diagnosis (confirmed root cause).
