# Kaizen Retrospective: `changes--overview-toc-map`

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-toc-map/` (archived 2026-08-28) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Solid: 4/4 tasks; 1 real rework (TCM-T-1, caught a data-correctness bug pre-ship); 1 environmental re-cut (foreign hunks); 1 HITL fix round; 0 HALT/Pivot |

## Metrics

| Metric | Target | Actual |
|---|---|---|
| Tasks / review rounds | 4 / 1 each | 4 / 1 rework (T-1) + 1 environmental FAIL (T-3, no attempt consumed) |
| LOC (budget ~430) | ~430 | ~560 incl. the HITL fix |
| Runtime failures | 0 | 1 Reviewer API drop (resumed); 1 lost Edit (concurrent session touching the tree) |

## Lessons

### KZ-TCM-1 (Product) — a "shared derivation" requirement needs a fixture on the axis that diverges
- **Root cause:** TCM-T-1's agreement test was genuinely independent but its fixture had every output node `is_aow: true` — the exact axis where the wrong partition diverged was structurally unexercised, so the test was green by accident. The Reviewer caught it only by reading the sibling code (`overviewAowProgress`) and the repo's own pinned spec.
- **Evidence:** archived `execution.md` TCM-T-1 attempts 1–2; red→green experiment on the fixed fixture.
- **Standardize (pending, spec branch):** one line in `docs/specs/general-setup/requirements.md` template guidance (defect-classes section): "For 'must agree with X' requirements, the fixture MUST include rows where a wrong implementation disagrees — name that axis explicitly."

## Noted, not a lesson
- ECharts `tree` defaults (`symbol: 'emptyCircle'`, radial label rotation) are invisible to jsdom — the HITL caught both in minutes; same pattern as KZ-SPO-1 (recurrence of the "T6 pays for itself" note, third time).
- Shared-worktree hazards recurred despite KZ-CVT-1 (pathspec commits held; NEW failure modes: foreign hunks forced a diff re-cut, and one Edit was silently lost mid-flight). The one-AKILI-session-per-checkout convention keeps being violated in practice; recurrence noted toward a stronger standardization if it bites again.
- Reviewer wrapper delivered verdicts reliably once briefs named the return channel (KZ-CVT-2 applied — worked).

## Pending Items

| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | guide-sync | `dashboard-lab/CLAUDE.md` + `program-overview/CLAUDE.md` | medium | Extend the already-queued rewrites: ToC map card (card 9, heading contract 8), `dashboard-lab.toc-map.ts` pure-model file, `TreeChart` registered in the wrapper, `tocMap*` builders in `program-overview.charts.ts`. | pending |
| 2 | standardization | `docs/specs/general-setup/requirements.md` (KZ-TCM-1) | medium | Fixture-on-the-diverging-axis line for "must agree" requirements. | pending |
| 3 | digest-update | follow-up proposals | low | Sankey alternative (recorded); center chips / indicator drill-down / keyboard drill-down MAYs. | pending |
| 4 | trd-adr | none | — | No ADR overturned (additive visualization). | n/a |
