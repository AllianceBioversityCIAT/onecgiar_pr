# Task Breakdown — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in "By AOW" View

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/by-aow-hierarchy-alignment` |
| Feature Code | `BHA` (By-AOW Hierarchy Alignment) |
| Module | `result-framework-reporting` / `dashboard-lab` |
| Status | approved |
| Author | Antigravity AI / Juan Carlos Cadavid |
| Date | 2026-09-04 |
| Budget (Tripwire) | 3 tasks · ~250 LOC diff · 1 review round |
| Linked Spec | `requirements.md` + `design.md` in same folder |

---

## 1. Scope of this Task List

This task list implements the technical specification to align the **"By AOW"** focused view in `dashboard-lab` with the **3-Level Card-in-Card** visual hierarchy and institutional ToC taxonomy (`HLO`, `OC`, `I-OC`) established in `reporting-aow-table`.

---

## 2. Pre-flight Checklist

- [x] `requirements.md` drafted and approved.
- [x] `design.md` drafted and approved.
- [x] Open questions resolved (pure client visual and parsing alignment).
- [x] Zero backend, DB, or migration dependencies.
- [x] Visual reference assets archived in `docs/specs/changes/by-aow-hierarchy-alignment/visual/`.
- [x] Baseline test suite verified green (150/150 reporting-aow-table tests pass, 972/972 dashboard-lab tests pass).

---

## 3. Task List

### `BHA-T-1` — Level 2 HLO Sub-Card Enclosure & Taxonomy Code Parsing
- **Type:** client
- **Description:** 
  Enhance `cleanHloCode` in `dashboard-lab.component.ts` to extract numeric prefixes like `1.1` from raw strings (e.g. `1.1: Agronomic...`). Implement `hloTaxonomy` helper to assign formal ToC categories (`HLO`, `OC`, `I-OC`, `IO`) strictly following Kaizen lesson `KZ-changes--reporting-aow-hierarchy-1`. Refactor By-AOW HLO groups in `dashboard-lab.component.html` (lines ~1712–1799) into autonomous sub-cards (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`) with gradient headers, rotating chevron in white button box, semantic taxonomy badge `pr-hlo-code`, and consolidated micro-KPI cluster (`TARGET`, `ACHIEVED`, indicator count pill, `QA% / PREL%`).
- **Implements:** `BHA-R-1` (Scenarios 1.1, 1.2), `BHA-R-2` (Scenario 2.1), `BHA-R-3` (Scenario 3.1), `BHA-NFR-1`, `BHA-DD-1`, `BHA-DD-2`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
- **Depends on:** `—`
- **Blocks:** `BHA-T-2`
- **Status:** `[x]` Complete
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [x] `cleanHloCode('1.1: Agronomic data')` returns `'1.1'`.
  - [x] `hloTaxonomy` returns formal ToC badges (`[HLO 1.1]`, `[OC 2.1]`, `[I-OC 3.5]`) and strips redundant prefixes cleanly.
  - [x] HLO header button in By-AOW wrapped in `.rounded-xl.border.border-slate-200\/90.bg-white.shadow-2xs.overflow-hidden`.
  - [x] Surface gradient `bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50`, rotating chevron in white button box, and taxonomy badge render cleanly.
  - [x] Micro-KPI cluster shows TARGET, ACHIEVED, count pill, and QA/Prel % formatted cleanly.
  - [x] JIT compilation check passes: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`.

---

### `BHA-T-2` — Level 3 Indented Indicator Scaffolding & Contextual Sub-Header
- **Type:** client
- **Description:** 
  Refactor the expanded indicator container in By-AOW (`dashboard-lab.component.html` lines ~1800–1935) into an indented scaffolding container with 24px left indentation (`pl-4 sm:pl-6`), an indigo vertical tree guide line (`border-l-4 border-indigo-500/40 bg-indigo-50/10`), and a compact contextual column sub-header (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`). Standardize child indicator rows with concentric bullseye target icons 🎯, JIRA status left-border stripes, center acronym chips, tabular figures, and isolated action buttons (*Report*, *Copy link*) using `$event.stopPropagation()` (`KZ-changes--reporting-aow-jira-hierarchy-2`). Preserve deeplink anchor `[id]="kpiDomId(ind)"` and `highlightedKpiId` outline.
- **Implements:** `BHA-R-4` (Scenario 4.1), `BHA-R-5` (Scenario 5.1), `BHA-R-6` (Scenario 6.1), `BHA-R-7` (Scenarios 7.1, 7.2), `BHA-NFR-1`, `BHA-NFR-2`, `BHA-NFR-3`, `BHA-DD-3`, `BHA-DD-4`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.scss`
- **Depends on:** `BHA-T-1`
- **Blocks:** `BHA-T-3`
- **Status:** `[x]` Complete
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [x] Expanded indicator container renders with `.pl-4.sm\:pl-6.border-l-4.border-indigo-500\/40.bg-indigo-50\/10`.
  - [x] Contextual sub-header renders with 6 uppercase column labels (`INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION`).
  - [x] Indicator rows render with bullseye 🎯, status stripes (`border-l-[3px]`), center chips, and progress bars.
  - [x] Action buttons invoke `$event.stopPropagation()` to prevent toggling parent row.
  - [x] `[id]="kpiDomId(ind)"` and `highlightedKpiId` deeplink outline functional.
  - [x] JIT compilation check passes: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`.

---

### `BHA-T-3` — Unit Test Suite Updates, Event Contract Verification & Documentation
- **Type:** tests / docs
- **Description:** 
  Update and extend `dashboard-lab.component.spec.ts` with dedicated test suites covering `cleanHloCode` numeric parsing, `hloTaxonomy` output, By-AOW sub-card DOM enclosure, badge display, indented scaffolding container, and interactive event isolation. Update `dashboard-lab/CLAUDE.md` documenting the 3-level Card-in-Card visual hierarchy in By-AOW.
- **Implements:** All `BHA-R-*` and `BHA-NFR-*` requirements at scenario and clause granularity.
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md`
- **Depends on:** `BHA-T-2`
- **Blocks:** `—`
- **Status:** `[x]` Complete
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `nestjs-expert`
- **Definition of done:**
  - [x] Unit tests for `cleanHloCode` numeric patterns pass (`1.1:`, `1.1`, `2.4.1`).
  - [x] Unit tests for `hloTaxonomy` pass (`HLO`, `OC`, `I-OC`, `IO`).
  - [x] DOM tests asserting sub-card `.rounded-xl.shadow-2xs` and `.pl-4.sm\:pl-6.border-l-4` pass.
  - [x] Event isolation tests asserting `stopPropagation` on Report and Copy link pass.
  - [x] Full dashboard-lab test suite passes (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/`).
  - [x] `npx ng lint --quiet` runs clean with 0 errors.
  - [x] `dashboard-lab/CLAUDE.md` updated with By-AOW 3-level hierarchy layout notes.

---

## 4. Dependency Graph

```
BHA-T-1 (Level 2 Sub-Card Enclosure & Taxonomy Code Parsing)
   └── BHA-T-2 (Level 3 Indented Indicator Scaffolding & Contextual Sub-Header)
         └── BHA-T-3 (Unit Test Suite Updates & Event Contract Verification)
```

---

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BHA-TEST-1` | unit (client) | `BHA-R-1` (Scenarios 1.1, 1.2) | `dashboard-lab.component.spec.ts` |
| `BHA-TEST-2` | unit (client DOM) | `BHA-R-2`, `BHA-R-3` | `dashboard-lab.component.spec.ts` |
| `BHA-TEST-3` | unit (client DOM) | `BHA-R-4`, `BHA-R-5`, `BHA-R-6` | `dashboard-lab.component.spec.ts` |
| `BHA-TEST-4` | unit (client events) | `BHA-R-7` (Scenarios 7.1, 7.2) | `dashboard-lab.component.spec.ts` |
| `BHA-TEST-5` | regression (client) | `BHA-NFR-4` | Full `dashboard-lab` suite (970+ tests) |

---

## 6. Rollout & Verification Plan

- [x] All 3 tasks executed and verified sequentially.
- [x] Automated verification run: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/` passes 100%.
- [x] Linter check run: `npx ng lint --quiet` clean with 0 errors.
- [x] Visual verification matching [`docs/specs/changes/by-aow-hierarchy-alignment/visual/reporting-table-reference.png`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/visual/reporting-table-reference.png).

---

## 7. Rollback Plan

1. Discard working tree changes in `dashboard-lab.component.ts`, `.html`, `.scss`, and `.spec.ts` via `git checkout -- <files>`.
2. Verify original baseline tests pass.

