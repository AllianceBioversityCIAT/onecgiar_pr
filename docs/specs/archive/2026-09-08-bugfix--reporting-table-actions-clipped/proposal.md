# Proposal — Reporting table row actions clipped at ≤1350px

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `reporting-table-actions-clipped` — derived from free-text argument |
| Spec Path | `bugfix/reporting-table-actions-clipped` |
| Type | Bug |
| Approval Mode | gated |
| Detected by | User report (screenshot, Science Program → Reporting tab, grouped view) |
| Date | 2026-09-01 |

## 2. Intent

Restore visibility of the per-row "···" actions menu (and the Report/Copy-link buttons beside it) in the Reporting tab's grouped indicator table when the viewport is **≤1350px** wide.

## 3. Problem / Current Behavior

At viewport widths at or below ~1350px, the rightmost columns of each indicator row — the Report button, the Copy-link icon, and the "···" overflow menu — disappear entirely. The row does not become horizontally scrollable; the controls are just gone, so at this breakpoint users lose the ability to open the row menu (View reported results / Target details / Copy link) and, functionally, to report against KPIs from the Reporting tab's default (grouped) view.

## 4. Proposed Outcome

At every supported viewport width (desktop-first, tablet must work per client conventions), the row's action controls (Report/Continue button, Copy-link icon, "···" menu) remain visible and operable — either by giving the row enough room to keep its fixed-width columns, or by making the row horizontally scrollable the same way the "All indicators" flat table already is.

## 5. Scope

- `reporting-aow-table.component.html` — the grouped-view indicator row template (`#indicatorRow`), specifically the action column (`<!-- 7 — Report / Continue -->`) and overflow menu (`<!-- 7 — overflow ··· -->`).
- `reporting-aow-table.component.scss` — `.pr-reporting-row` grid (`grid-template-columns: 28px minmax(280px, 1fr) 80px 80px 112px 132px 136px 36px`) and `.pr-collapse` / `.pr-collapse-inner` (`overflow: hidden`) that currently clips overflow instead of scrolling it.
- Verification at common breakpoints around and below 1350px (tablet width included, per `src/CLAUDE.md` responsive rule).

## 6. Non-Goals

- No change to the "All indicators" flat table (`.pr-flat-table`), which already scrolls horizontally via `.pr-flat-scroll { overflow-x: auto }` and is not affected by this bug.
- No redesign of the row's column set, widths, or the action affordances themselves (Report label logic, menu items) — this is a layout/visibility fix, not a feature change.
- No change to the HLO sub-group header grid (`.pr-hlo-head`) beyond whatever is needed to stay visually aligned with the row grid it mirrors.

## 7. Affected Users, Systems, And Specs

- **Users:** anyone reporting against KPIs from the Reporting tab's default grouped view on a laptop-class screen (≤1350px is a common laptop viewport, e.g. a 13" screen at 100% zoom or any screen with devtools/a side panel open).
- **Component:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/` (has its own `CLAUDE.md` — must be re-stamped in the same commit per `docs/COMPONENT-DOCS.md`).
- **Related spec history:** MRF-R-3.1/R-5 (Next pending + Copy link) and P2-3296 (Progress column) both touched this same row grid and both left load-bearing notes in the component's `CLAUDE.md` about the grid track widths — the fix must respect those, not just widen things ad hoc.

## 8. Visual Reference

- Source: None (bug fix; the reported screenshot shows the *broken* state, not a target design)
- Location: user-provided screenshot, Science Program `SP08` → Reporting tab, `4.2.3 NETWORKS` group
- Notes: no new visual design needed — outcome is "controls stay visible," not a new layout.

## 9. Bug Diagnosis

### Observed Symptom
On the Reporting tab (grouped/by-AoW view) of a Science Program dashboard, at a browser viewport width of ≤1350px, each indicator row's rightmost controls — the Report/Continue button, the Copy-link icon, and the "···" more-actions menu — are not visible at all (not just squeezed).

### Reproduction Steps
1. Open a Science Program's Reporting tab in the grouped (by-AoW) view, with the browser window ≥1400px wide. Confirm the row shows Target, Achieved, Status, Progress (QA/Prel bars), a Report/Continue action, a Copy-link icon, and a "···" menu button on the right edge of each row.
2. Resize the browser window (or viewport) down to ≤1350px, keeping the left navigation sidebar visible.
3. Observe: the "···" menu button (and often the Report button/Copy-link icon next to it) is no longer rendered/visible in the row. Expected: those controls remain visible and clickable, or the row becomes horizontally scrollable so they can be reached.

### Root Cause (confirmed)
The grouped-view row (`.pr-reporting-row` in `reporting-aow-table.component.scss:69-97`) is a CSS grid with an all-fixed-and-minmax track list:

```
grid-template-columns: 28px minmax(280px, 1fr) 80px 80px 112px 132px 136px 36px;
```

Summing the non-flexible tracks (28 + 80 + 80 + 112 + 132 + 136 + 36 = 604px) plus the title column's own 280px floor, 7×16px gaps (112px), and the row's horizontal padding (32px left + 20px right = 52px) gives a **hard minimum content width of ~1048px** for one row. This grid lives inside `.pr-collapse-inner` (`reporting-aow-table.component.scss:28-31`), which is intentionally `overflow: hidden` — a comment in the same file explains this is required for the height-animation trick used by the collapsible AoW/HLO cards.

There is no horizontal-scroll wrapper around the grouped row grid (unlike the "All indicators" flat table, which is deliberately wrapped in `.pr-flat-scroll { overflow-x: auto }`, per `reporting-aow-table.component.html:24-27`). So when the card's available width drops below the row's ~1048px minimum, the grid does not shrink its fixed tracks and does not get a scrollbar — the overflow is silently clipped by the ancestor's `overflow: hidden`, and the last tracks (action buttons, "···" menu) are the ones pushed outside the visible box.

The ~1350px threshold the user observed lines up with this: the left `reporting-nav-sidebar` is ~280px wide, and typical page gutters/margins around the card consume another ~20-50px, leaving the card only ~1020-1050px of width at a 1350px viewport — right at the row's minimum. Below that, clipping starts.

### Impact & Scope
- Affects only the **grouped/by-AoW view** of the Reporting tab (`reporting-aow-table.component.html`'s `@else` branch, the `#indicatorRow` template) — confirmed the flat "All indicators" table is unaffected because it already scrolls.
- No data-integrity or security implications — purely a CSS layout/visibility defect. Functionally it blocks reporting and the row menu at narrower widths, which is a real workflow blocker for laptop users, not merely cosmetic.
- The same track list is echoed in `.pr-hlo-head` (the sub-group header row, `reporting-aow-table.component.scss:50-65`) for alignment — any fix that changes the row's track widths must update `.pr-hlo-head` identically or the header and rows will drift out of alignment (this file's own `CLAUDE.md` and inline comments flag this coupling explicitly).

### Fix Strategy
This needs a real layout decision, not a one-line tweak, so it is not `/akili-quick` material — logic-adjacent CSS behavior (a grid track list plus its animation-critical `overflow: hidden` ancestor) and a component with its own load-bearing `CLAUDE.md` warrant `/akili-specify` (Lite) in Bug Mode with a regression test (viewport-driven visibility assertion, e.g. a Cypress or Jest+jsdom style check that the "···" button remains in the accessibility tree / has non-zero bounding box at 1350px and below).

Two candidate approaches (to be finalized in `/akili-specify`):
1. **Give the row its own horizontal scroller**, mirroring `.pr-flat-scroll`, so the grouped row grid behaves exactly like the flat table already does at narrow widths (smallest, most consistent fix — reuses an existing, working pattern in the same component).
2. **Compress the fixed tracks at a breakpoint** (e.g. combine/hide the Progress bars' text labels, or narrow Target/Achieved at ≤1350px) so the whole row fits without scrolling — more design work, higher regression risk against the P2-3296/MRF-R-5 pinned widths.

Recommended: Option 1 (scroll wrapper), because it does not touch the pinned, comment-protected track widths that two prior specs (P2-3296, MRF-R-5) already fought over, and it reuses a pattern (`.pr-flat-scroll`) already proven in this exact component.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Horizontal scroll wrapper (recommended)** | Wrap `.pr-reporting-row` (and `.pr-hlo-head`) in a scroll container like `.pr-flat-scroll`, with a `min-width` matching the row's real minimum so nothing clips. | Smallest change, reuses a proven pattern in the same file, does not touch pinned track widths. Introduces a horizontal scrollbar on laptop widths, which is an acceptable, expected pattern (the flat table already does this). |
| **B — Responsive track compression** | Add a breakpoint (e.g. `@media (max-width: 1350px)`) that narrows/collapses some columns (e.g. merge QA/Prel into one line, shrink Target/Achieved). | Keeps the "no scrollbar" feel, but reopens the pinned widths two prior specs (P2-3296, MRF-R-5) locked down after regressions — higher risk, more design/QA time. |
| **C — Do nothing, document as known limitation** | Leave as-is. | Not viable — this blocks a real workflow (reporting KPIs) below a common laptop width; not acceptable per the proposed outcome. |

## 11. Recommended Approach

**Option A.** Add a horizontal-scroll wrapper around the grouped-view row grid, matching the existing `.pr-flat-scroll` pattern already used for the "All indicators" table in the same component. This is the smallest safe path: it does not touch the fixed track widths that two previous specs pinned down after real regressions, it reuses an established, already-tested pattern in this exact file, and it guarantees the action controls are always reachable (via scroll) rather than conditionally visible.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** `.pr-collapse-inner`'s `overflow: hidden` is load-bearing for the height-collapse animation (per its own comment). The scroll wrapper must be added *inside* that container without breaking the animation — needs careful placement/testing, not a blind `overflow-x: auto` on the same element that already owns `overflow: hidden` for the vertical clip.
- **Risk:** `.pr-hlo-head` (the sub-group header) mirrors the row's track list for alignment. If Option A's wrapper is added only to the row and not the header, the header will visually drift out of alignment with the scrolled row at narrow widths — the fix must wrap both together or scroll them in sync.
- **Dependency:** `reporting-aow-table/CLAUDE.md` must be updated and re-stamped in the same commit (component-doc convention, `docs/COMPONENT-DOCS.md`), since this changes documented, load-bearing layout behavior.
- **Open question:** should the scroll wrapper also apply to the AoW-card header row's summary stats (Target/Achieved/QA/Prel/ratio bar), which use their own flex layout and were not confirmed clipped in the report? Recommend scoping the fix to the indicator row + HLO head first, and only extending if QA finds the card header also affected.

## 13. Success Criteria

- At 1350px, 1280px, 1024px, and 768px viewport widths (with the reporting nav sidebar visible), the Report/Continue button, Copy-link icon, and "···" menu remain visible and clickable on every indicator row in the grouped Reporting view — either directly or via horizontal scroll within the row.
- The sub-group header (`.pr-hlo-head`) stays visually aligned with the row grid at every tested width.
- No regression to the existing "All indicators" flat table, which already scrolls correctly.
- A regression test (Jest/Cypress, per the fix's actual mechanism) asserts the "···" button has a non-zero, in-viewport bounding box (or an equivalent scroll-reachability assertion) at ≤1350px.

## 14. Next Step

```text
/akili-specify bugfix/reporting-table-actions-clipped
```

Run in **Bug Mode** — `/akili-specify` will convert this confirmed root cause into a fix plan (Option A, horizontal scroll wrapper) and a mandatory regression test.
