# Kaizen Retrospective — Reporting By-AoW View Tabular Layout & HLO/Outcomes Consistency

- **Spec Path:** `docs/specs/changes/reporting-by-aow-tabular-consistency/`
- **Archive Date:** 2026-09-03
- **Branch:** `qa-development-2026` (spec branch; pin `master`)
- **Outcome:** Clean Execution & Delivery — 3/3 Tasks Completed, 3/3 Reviewer PASS on attempt 1
- **Commit:** `53878f62b`

---

## Metrics

| Metric | Planned | Actual | Ratio / Notes |
|---|---|---|---|
| Tasks | 3 | 3 | 100% — `BTC-T-1`, `BTC-T-2`, `BTC-T-3` |
| Rework Attempts | 0 | 0 | 3/3 tasks passed on first attempt |
| Review Rounds | 3 | 3 | All PASS on Attempt 1 |
| Unit Tests (Dashboard) | ~50 | 55 | 100% PASS (848 suite total) |
| Unit Tests (Table) | ~120 | 124 | 100% PASS |
| Linter Errors | 0 | 0 | `ng lint` clean |
| Dev Build | PASS | PASS | 15.9s, 0 errors |

---

## Lessons

- **KZ-changes--reporting-by-aow-tabular-consistency-1 — Disparate Views of the Same Entity Require Shared Track Math to Guarantee Visual Parity.** (Product, Low)
  - Root cause: The All-AoWs view used CSS Grid (`$pr-reporting-tracks`) while the By-AoW view used inline flex items. By moving By-AoW to a dedicated fixed CSS Grid (`$pr-by-aow-tracks: 28px minmax(240px, 1fr) 76px 76px 64px 130px;`), numbers no longer jitter horizontally across rows regardless of digit count.
  - Evidence: `dashboard-lab.component.scss:264`, `dashboard-lab.component.html:1700-1760`.
  - Standardization: → P1 (local).

- **KZ-changes--reporting-by-aow-tabular-consistency-2 — Centralize Parsing Regexes Across Sibling Components to Prevent Taxonomy Drift.** (Product, Low)
  - Root cause: `cleanHloCode` was implemented separately in both `dashboard-lab.component.ts` and `reporting-aow-table.component.ts`, with neither initially supporting `I-OC` or `OC` prefixes. Updating both simultaneously prevents visual regression when switching between views.
  - Evidence: `dashboard-lab.component.ts:4148`, `reporting-aow-table.component.ts:504`.
  - Standardization: → P2 (local).

---

## Noted, not a lesson

- **Stacked numeric cells with responsive sub-labels eliminate label repetition:** Using a stacked cell with `112` (large) and `TARGET` (sub-label, visible on mobile) provides the best balance between executive table clarity and responsive readability.

---

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/AGENTS.md` |
| Edit | Add: "By-AoW view group headers must use `$pr-by-aow-tracks: 28px minmax(240px, 1fr) 76px 76px 64px 130px;` with `.pr-by-aow-head` and `.pr-by-aow-row` to guarantee vertical column alignment across HLOs and Outcomes." |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/AGENTS.md` |
| Edit | Add: "ToC code sanitization regex must support `(?:HLO|HL|I-OC|OC|IO|EOI)` prefixes and trim trailing punctuation across all reporting controllers." |
| Severity | Low |
| Status | pending |
