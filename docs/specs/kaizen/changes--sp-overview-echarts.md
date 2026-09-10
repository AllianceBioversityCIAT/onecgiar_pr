# Kaizen Retrospective: `changes--sp-overview-echarts` (family: 3 children + parent)

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/sp-overview-echarts/` (archived 2026-08-27, children nested) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Near-clean: 8/8 tasks PASS; 1 rework round (OVW-T-1, evidence-completeness); 0 HALT/Pivot/FATAL; 3 user-driven post-execution quicks |

## Metrics
| Metric | Target | Actual |
|---|---|---|
| Children / tasks / review rounds | 3 / 8 / ≤2 per child | 3 / 8 / 1 rework total |
| Parallel execution | #1 ∥ #2 | Achieved (#2 in a peer session's worktree) — one env gap (`npm ci` after dependency merge) |
| Reviewer FAILs / HALTs / Pivots | 0 | 1 FAIL (test coverage of a MUST clause) / 0 / 0 |
| Runtime failures | 0 | 2 spawns died on expired auth (no work lost, no attempt consumed) |

## Lessons

### KZ-SPO-1 (Product) — ECharts hides overlapping category-axis labels silently
- **Root cause:** ECharts' default `axisLabel.interval: 'auto'` drops labels instead of overflowing — a chart can render with most of its columns unlabeled and every automated gate green (jsdom cannot see it).
- **Evidence:** user screenshot 2026-08-27 (`quick/heatmap-axis-abbreviations`): only 2 of 4 / 2 of 7 column labels rendered; fixed with `interval: 0` + display-only abbreviations + rotate >5 cols.
- **Standardize (pending, spec branch):** add to `pr-viz-chart` usage guidance (child guide or `docs/ux-ui/design.md §8` entry): "Category axes MUST set `axisLabel.interval: 0`; long labels get display-only abbreviation/rotation — never trust ECharts auto-hide."

## Noted, not a lesson
- The T6/HITL visual gate paid for itself: three real UX defects (hidden labels, suboptimal card narrative, off-palette donut) surfaced within minutes of the user looking at a live render — none visible to jsdom. Already institutionalized (requirements §9 substitute-gate rule); recurrence only.
- Scout-before-specify prevented two shipped bugs (status-name vocabulary, plural `W3/Bilaterals`) — same pattern as partner-role-separator's "verify before speccing" note.
- Forward-pointer mechanism worked as designed: T-3's Reviewer gap (unreachable loading skeleton) was carried in T-4's brief and delivered.
- Worktree parallel execution needs a dependency-sync step: a sibling's `package.json` merge leaves `node_modules` stale in other checkouts — `npm ci` before verification. Candidate one-liner for `.agents/leader.md` concurrency protocol if it recurs.
- Post-execution user quicks amended two approved design decisions (§6.2 order; OVW-DD-5 → DD-5a) — both recorded as amendments in the archived design.md, assertion edits deliberate. The amendment pattern (never silent rewrite) held.

## Pending Items
| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | guide-sync | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/CLAUDE.md` | high | Rewrite stale invariants: rows are now navigable buttons emitting `openResults` (no `disabled`/"Coming soon"); "Do not upgrade to a chart" → "DOM bars for single-series rows; `app-pr-viz-chart` for matrices/donut, always with `tableModel`"; card order = amended §6.2 order; drop stale `bilateralRoles` row; add `program-overview.charts.ts` to the file map. | pending |
| 2 | guide-sync | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/CLAUDE.md` | medium | Document the query-param contract: `status`/`category`/`origin`/`center` hydrate the filter service on load and mirror back (`merge`+`replaceUrl`); constants in `services/programme-results-query-params.ts` — external links must import them. | pending |
| 3 | guide-sync | `docs/ux-ui/design.md` §8 | medium | Register `app-pr-viz-chart` (ECharts SVG wrapper: options+tableModel pairing, chartClick; category axes `interval: 0` + abbreviations per KZ-SPO-1). | pending |
| 4 | factual-sweep | `docs/ux-ui/design.md` §8 | low | Stale claim "chart (used by `chart.js`)" — now two engines: chart.js (RFR home insights) and echarts (`pr-viz-chart`); reword. | pending |
| 5 | standardization | per KZ-SPO-1 (folds into item 3) | medium | Axis-label rule line. | pending |
| 6 | digest-update | follow-up proposals (not guide edits) | low | Recorded candidates: `changes/overview-chart-view-toggle` (bars↔heatmap, reverts OVW-DD-4, user-requested); OQ-1 bar-count alignment; `chart.js` retirement + dead `pages/entity-details/` cleanup; `programDescription` unbound input (all SPs show SP01 copy). | pending |
| 7 | trd-adr | none | — | No TRD ADR overturned (OVW-DD-5→DD-5a is spec-internal; echarts adoption is additive). | n/a |
EOF
echo kaizen written