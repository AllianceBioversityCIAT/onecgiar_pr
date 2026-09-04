# Archive Summary — Reporting AoW & HLO JIRA-Style Hierarchy

The Area of Work (AoW) and High-Level Output (HLO) sections in the Results Framework Reporting module were refactored into a clear, scannable JIRA-style visual hierarchy with compact vertical spacing, standardized code badges, consolidated tabular metrics, in-card quick filters, and 3px colored status indicator stripes.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/reporting-aow-jira-hierarchy/` |
| Archive date | 2026-09-03 |
| Final status | **Done** — `RAJ-T-1`, `RAJ-T-2`, `RAJ-T-3` `[x]` PASS |
| Approval mode | gated (`proposal.md`); Standard |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Tasks Total | 3 completed (3/3 PASS on attempt 1) |

## Original Spec Path

`docs/specs/changes/reporting-aow-jira-hierarchy/`

## Archive Date

2026-09-03

## Final Status

**Shipped on `qa-development-2026` (commit `aee9b8ea8`).** All 3 tasks completed and verified with Reviewer PASS. `test-report.md` and `validation-report.md` absent — accepted as standard execution evidence is detailed in `execution.md` with 100% passing tests (114/114 in AoW table spec, 57/57 in program band spec, 46/46 in dashboard-lab spec, 789/789 across dashboard-lab suites).

## Requirements Delivered

| ID | Requirement | Outcome |
|---|---|---|
| `RAJ-R-1` | Standardized HLO Code Badge | Mono purple badge token (`HLO4`, `IO1`, etc.) rendered alongside clean group title in both All-AoWs and By-AoW views |
| `RAJ-R-2` | Tabular Metrics Cluster | Consolidated right-aligned metrics: `Target: X`, `Achieved: Y` (in green), `QA %` / `Prel %`, and clean numeric KPI count pill; duplicate `N indicators` text removed |
| `RAJ-R-3` | JIRA-Style Status Stripe | 3px left border stripe (`border-l-[3px]`) mapped to semantic PRMS color tokens (green for Achieved, purple for Overachieved, primary blue for In progress, slate for Not started) on indicator rows |
| `RAJ-R-4` | In-Card Quick Breakdown Bar | Centers and Types filter buttons compacted into a sleek 32px horizontal bar inside each AoW accordion card |
| `RAJ-R-5` | All-AoWs and By-AoW Visual Parity | Shared HLO badge chip, tabular metrics, and 3px status striping applied identically to the By-AoW view |
| `RAJ-R-6` | Responsive Degradation Ladder | Smooth layout degradation without horizontal overflow down to 768px (percentages collapse to `sr-only` below 900px, coverage text hides below 1200px) |
| `RAJ-R-7` | Redundant Section Heading Removal | Removed "Report results linked to the program's 2026 ToC" heading, reclaiming ~50px vertical height |

## Spacing & Layout Improvements (Post-Review Fine-Tuning)

- **Summary Cards Separation**: Added `pb-[16px]` to summary cards container in `reporting-program-band.component.html` to eliminate touching the first AoW card.
- **Card Compression**: Compacted 4 summary cards (`p-[12px] px-[16px]`, 24px numbers, 11.5px subtitle) to regain vertical viewport height.
- **AoW Row Compression**: Reduced AoW card gap from 20px to 10px and AoW header height from 68px to 52px.
- **Horizontal Row Balance**: Balanced AoW header row into 3 zones (identity, centered progress bar and ratio, right-aligned metrics and By-AOW action) eliminating the dead center void.

## Files Changed Summary

| Area | Files |
|---|---|
| Production | `reporting-program-band.component.html` — Removed redundant heading, added `pb-[16px]`, compacted 4 summary cards<br>`reporting-aow-table.component.html` — 52px AoW headers, 3-zone layout, in-card 32px filter bar, HLO badges, tabular metrics, 3px status stripes on `#indicatorRow`<br>`reporting-aow-table.component.scss` — Styling tweaks<br>`reporting-aow-table.component.ts` — `cleanHloCode`, `infoBlurb`<br>`dashboard-lab.component.html` — By-AoW view visual parity (HLO badges, tabular metrics, 3px stripes, 32px filter bar)<br>`dashboard-lab.component.ts` — `cleanHloCode` helper |
| Tests | `reporting-program-band.component.spec.ts` — Heading removal tests<br>`reporting-aow-table.component.spec.ts` — Status stripes, HLO badges, tabular metrics, event preservation<br>`dashboard-lab.component.spec.ts` — `cleanHloCode` tests |
| Spec | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `judgment.md`, mockups |

## Test Evidence Summary

- Scoped Jest: `npx jest --testPathPattern="reporting-aow-table.component.spec.ts"`: **114/114 PASS**
- Band Jest: `npx jest --testPathPattern="reporting-program-band.component.spec.ts"`: **57/57 PASS**
- Dashboard Lab Spec: `npx jest --testPathPattern="dashboard-lab.component.spec.ts"`: **46/46 PASS**
- Linter: `npx ng lint --quiet`: **0 errors**
- TypeScript / Angular Build: `npx ng build --configuration development`: **0 errors**

## Accepted Warnings Or Follow-Ups

None.

## Historical Notes

This change originated from user feedback requesting a cleaner, more organized information hierarchy reminiscent of JIRA boards for the AoW and HLO structures in Results Framework Reporting. Through an adversarial dual-review (Judgment Day), the design was hardened with explicit responsive degradation thresholds and strict 100% preservation of all five indicator event contracts (`openRow`, `reportRow`, `openTarget`, `openAchieved`, `copyLink`).
