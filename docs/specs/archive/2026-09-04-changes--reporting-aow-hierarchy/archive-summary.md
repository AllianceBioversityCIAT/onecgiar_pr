# Archive Summary — 3-Level Visual Hierarchy Refinement in Reporting AoW Table

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/reporting-aow-hierarchy/` |
| Archive Path | `docs/specs/archive/2026-09-04-changes--reporting-aow-hierarchy/` |
| Feature Name | 3-Level Visual Hierarchy Refinement (`reporting-aow-table`) |
| Module Code | `RAH` |
| Final Status | `completed` |
| Archive Date | 2026-09-04 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Tasks Executed | 3 / 3 (`RAH-T-1`, `RAH-T-2`, `RAH-T-3`) |
| Review Verdict | 3 / 3 `STATUS: PASS` on first attempt |

---

## 2. Executive Summary

This specification established a distinct 3-level Card-in-Card visual hierarchy in the Science Program reporting tab (`reporting-aow-table`):
1. **Level 1: Area of Work (AOW) Macro Card:** Outer shell card (`rounded-2xl border-slate-200`) hosting the AOW code badge (`AOW01`), overall progress bar, "By AOW" action, and integrated quick-filters toolbar (`Centers`, `Types`).
2. **Level 2: High-Level Output (HLO) Meso Sub-Cards:** Autonomous sub-cards (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`) with subtle surface gradient headers (`bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50`), rotating chevrons, institutional ToC taxonomy badges (`HLO 1.1`, `HLO 1.2`, `OC 3.1`, `I-OC 3.5`), and consolidated micro-KPI metric clusters (Target, Achieved, count pill, QA/Prel %).
3. **Level 3: Micro Indented Indicator Scaffolding:** 24px responsive indentation (`pl-4 sm:pl-6`), vertical tree guide line (`border-l-4 border-indigo-500/40 bg-indigo-50/10`), compact 28px contextual column sub-header (`INDICATOR TITLE & TAXONOMY | Target | Achieved | Status | Progress | Action`), and crisp white indicator cards preserving JIRA status stripes (`border-l-[3px]`), bullseye icons, and full event isolation (`emitAndStop`).

---

## 3. Requirements Delivered

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| `RAH-R-1` | Level 2 Autonomous HLO Sub-Card Enclosure | Delivered | `reporting-aow-table.component.html:646` |
| `RAH-R-2` | Semantic Taxonomy Badges (`HLO 1.1`, `OC`, `I-OC`) | Delivered | `reporting-aow-table.component.ts:536` (`hloTaxonomy`) |
| `RAH-R-3` | Consolidated Micro-KPI Metric Alignment | Delivered | `reporting-aow-table.component.html:685` |
| `RAH-R-4` | Level 3 Indented Child Scaffolding & Tree Line Guide | Delivered | `reporting-aow-table.component.html:728` |
| `RAH-R-5` | Contextual Column Sub-Header | Delivered | `reporting-aow-table.component.html:730` |
| `RAH-R-6` | Event Isolation & Keyboard/ARIA Preservation | Delivered | `reporting-aow-table.component.spec.ts:585` |
| `RAH-NFR-1` | Micro-transition Performance (≤ 200ms) | Delivered | CSS transitions on chevron (`duration-200`) and rows (`duration-150`) |
| `RAH-NFR-2` | Responsive Fluidity (< 900px viewport) | Delivered | `pl-4 sm:pl-6` indentation; `max-[899px]:sr-only` for secondary metrics |
| `RAH-NFR-3` | PRMS Design Token Compliance | Delivered | `docs/ux-ui/design.md` §7 token mappings (`--pr-color-primary-*`, `--pr-surface-*`) |

---

## 4. Files Changed Summary

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`:
  - Implemented Level 2 sub-card enclosure with surface gradient headers, rotating chevrons, taxonomy badges, and consolidated micro-KPIs.
  - Implemented Level 3 indented scaffolding (`pl-4 sm:pl-6`, `border-l-4 border-indigo-500/40`, `bg-indigo-50/10`) and contextual column sub-header.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`:
  - Added `hloTaxonomy(hlo, band)` helper to resolve institutional ToC taxonomy (`HLO`, `OC`, `I-OC`, `EOI`) and strip redundant prefixes.
  - Enhanced `cleanHloCode` and `clusterByTitle` regexes to recognize numeric patterns like `1.1:`.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`:
  - Adjusted `$pr-reporting-pad: 8px 16px;` and `.pr-hlo-head` height to `28px` (`h-7`) for pixel-aligned tabular tracks.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts`:
  - Added 7 dedicated unit tests verifying Level 3 DOM scaffolding, column headers, click event emissions, event isolation (`stopPropagation`), keyboard navigation, and ARIA attributes. Total tests: 150/150 passed.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md`:
  - Synced documentation detailing the 3-Level Card-in-Card Hierarchy architecture and event isolation invariants.

---

## 5. Verification & Test Evidence

- **Scoped Component Tests:** 150 passed / 150 total in `reporting-aow-table.component.spec.ts` (3.3s).
- **Dashboard Lab Suite:** 972 passed / 972 total across 26 test suites (8.0s).
- **Client Linter:** `All files pass linting.` (0 errors via `ng lint`).
- **Review Verdicts:** 3 / 3 Tasks reviewed by independent `akili-reviewer` subagents; all received `STATUS: PASS` on attempt 1.
- **Post-Execution Refinement:** Refined generic `OUTPUT` to institutional `HLO` nomenclature per user feedback; all tests and linter re-verified clean.
