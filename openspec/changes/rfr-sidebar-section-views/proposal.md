## Why

The Results Framework Reporting (RFR) home currently packs Planned ToC, Emerging results, and My CGIAR Centers into one dashboard, while the sidebar only lists Science Programs. Users need a clearer mental map: a subtle conceptual group for reporting actions, plus dedicated views for each action and a Dashboard that keeps today’s full layout.

**Scope:** frontend-only (`onecgiar-pr-client`). No Jira id on branch `performance-refactor` — track as UX nav work on that epic branch.

## What Changes

- Under the existing RFR sidebar collapsible, add a **subtle non-collapsible group label** (“Results framework and reporting”) with lighter gray type at the same indent as other nested labels.
- Add four sibling nav links under that label (not a second collapsible):
  - **Dashboard** — current combined dashboard-lab / home layout unchanged.
  - **Results planned in your 2026 ToC** — only that section’s content.
  - **Report Emerging results** — only that section’s content.
  - **My CGIAR Centers** — only that section’s content.
- Keep the existing Science Program tree below (My / Other programs / projects) as today.
- Add lightweight RFR child routes (or equivalent) that reuse `DashboardLabComponent` and filter which blocks render; preserve `?sp=` selection.
- Update collapsed-rail flyout for RFR so the four section links remain reachable when the icon rail is collapsed.

## Capabilities

### New Capabilities

- `rfr-section-nav`: Sidebar conceptual grouping and section views (Dashboard + Planned + Emerging + Centers) for Results Framework Reporting.

### Modified Capabilities

- (none — no archived master spec for this nav surface yet)

## Impact

- `reporting-nav-sidebar` (HTML/TS/SCSS, flyout)
- `ResultFrameworkReportingRouting` in `routing-data.ts`
- `DashboardLabComponent` (read view mode; show/hide bento blocks)
- No server/API changes
