# Result Framework Reporting — Landing Page Planned KPIs & Results Breakdown — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `result-framework-reporting` — Landing Page Program Cards (`app-result-framework-reporting-card-item`)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Status:** `completed`
- **Owner / driver:** Implementer
- **Target Phase:** 2026 Reporting Phase

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are resolved.
- [x] Zero extra DB queries required; logic leverages existing in-memory ToC target queries.
- [x] No conflicting in-flight specs touching `result-framework-reporting-card-item`.
- [x] No database migrations needed; purely additive DTO and UI enhancements.

---

## 3. Task list

### RFR-T-1: Server DTO Extension & Progress Service Aggregation
- **Type:** server
- **Description:** Extend `ScienceProgramProgressDto` and `VersionProgressDto` with `plannedKpis: number | null`, `replicatedResults: number`, and `newResults: number`. In `results.service.ts`:
  - Update `calculateInitiativeProgress()` to capture `indicatorContributions.size` (the count of planned ToC indicators for that year) and return it alongside progress.
  - Update `buildScienceProgramBuckets()` to tally `replicatedResults` (where `row.is_replicated` is truthy) and `newResults` (where `row.is_replicated` is falsy) on both the initiative and version containers.
  - Enforce the arithmetic invariant: `replicatedResults + newResults === totalResults`.
- **Implements:** `RFR-R-1`, `RFR-R-2`, `RFR-R-5`, `RFR-AC-1`, `RFR-AC-3`, `RFR-AC-6`
- **Files (expected):**
  - `onecgiar-pr-server/src/api/results/dto/science-program-progress.dto.ts`
  - `onecgiar-pr-server/src/api/results/results.service.ts`
- **Depends on:** `—`
- **Blocks:** `RFR-T-2`, `RFR-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** Calling `GET /api/results-framework-reporting/get/science-programs/progress` produces initiatives without `plannedKpis`, `replicatedResults`, or `newResults`, or `replicatedResults + newResults !== totalResults`.
  - **Red run:** `npx jest --testPathPattern="results.service.spec.ts" --silent`
  - **Disqualifier:** A new database query is added to `getScienceProgramProgress` that increases latency beyond baseline.
  - **Consumers:** `ResultsController.getScienceProgramProgress`, `ResultsFrameworkReportingController.getScienceProgramProgress`.
- **Definition of done:**
  - [x] `ScienceProgramProgressDto` and `VersionProgressDto` carry `@ApiProperty()` annotations for `plannedKpis`, `replicatedResults`, `newResults`.
  - [x] `results.service.ts` populates all three fields without issuing extra SQL queries.
  - [x] Server lint clean: `npx eslint "src/api/results/**/*.ts" --quiet`.
  - [x] Server unit tests in `results.service.spec.ts` assert the populated fields.

---

### RFR-T-2: Client Interface Extension & Card Component UX/UI Implementation
- **Type:** client
- **Description:** Update `SPProgress` interface to include `plannedKpis`, `replicatedResults`, and `newResults`. Update `ResultFrameworkReportingCardItemComponent` (`result-framework-reporting-card-item.component.html`, `.ts`, `.scss`):
  - **Tier 1 Primary Metrics:** Display `totalResults` + `results this phase` alongside a planned KPIs badge (`[plannedKpis] planned KPIs` with ToC flag icon and tooltip). Gracefully handle null/0 as `— planned KPIs`.
  - **Tier 2 Origin Breakdown:** In expanded view (`!homeService.compactView()`), render an origin sub-row with `replicatedResults replicated` (sync icon) and `newResults new` (add icon), plus an accessible info tooltip explaining replication.
  - **Tier 3 Workflow Status:** Keep existing segmented status bar and workflow status chips.
  - **Compact View:** Ensure origin sub-row and status bar collapse seamlessly, leaving clean condensed metrics (`[totalResults] results · [plannedKpis] planned KPIs`).
  - Use Tailwind utilities and PRMS design tokens (`--pr-color-secondary-400`, `text-brand-400`, `bg-brand-50`, `material-icons-round`, `prTooltip`).
- **Implements:** `RFR-R-1`, `RFR-R-2`, `RFR-R-3`, `RFR-R-4`, `RFR-AC-1`, `RFR-AC-2`, `RFR-AC-3`, `RFR-AC-4`, `RFR-AC-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/shared/interfaces/SP-progress.interface.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.scss`
- **Depends on:** `RFR-T-1`
- **Blocks:** `RFR-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Review:** `full` (UI component & design tokens)
- **Verification:**
  - **Falsifier:** Card text clips or wraps at 315px width, tooltips fail to trigger on hover/focus, or origin badges stay visible when `compactView()` is true.
  - **Red run:** `npx jest --testPathPattern="result-framework-reporting-card-item.component.spec.ts" --silent`
  - **Disqualifier:** Layout introduces horizontal overflow, scrollbars, or hardcoded hex colors not present in the PRMS palette.
  - **Consumers:** `ResultFrameworkReportingHomeComponent` (`app-result-framework-reporting-card-item`).
- **Definition of done:**
  - [x] `SPProgress` interface updated with optional `plannedKpis`, `replicatedResults`, `newResults`.
  - [x] Card template updated with Tier 1 dual metrics and Tier 2 origin breakdown sub-row.
  - [x] Contextual tooltips properly bound with `prTooltip`.
  - [x] Compact View toggle hides Tier 2 and Tier 3 cleanly without visual jump.
  - [x] Client lint clean: `npx ng lint --quiet`.

---

### RFR-T-3: Automated Test Suite & Verification
- **Type:** tests
- **Description:** Author and run automated unit tests across server and client packages:
  - **Server (`results.service.spec.ts`):** Verify that `getScienceProgramProgress` computes `plannedKpis` from ToC contributions, correctly tallies `replicatedResults` and `newResults` from row fixtures, and guarantees `replicated + new === total`.
  - **Client (`result-framework-reporting-card-item.component.spec.ts`):** Verify rendering of planned KPIs pill, origin breakdown badges, null ToC fallback, and compact view DOM transitions.
- **Implements:** All Acceptance Criteria `RFR-AC-1` through `RFR-AC-6`, Defect Classes §8
- **Files (expected):**
  - `onecgiar-pr-server/src/api/results/results.service.spec.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.spec.ts`
- **Depends on:** `RFR-T-1`, `RFR-T-2`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** Assertions fail if planned KPIs badge or origin pills are missing from the DOM or if counts do not reconcile.
  - **Red run:** `npx jest --testPathPattern="results.service.spec.ts|result-framework-reporting-card-item" --silent`
  - **Disqualifier:** Tests use superficial mocks that don't execute `buildScienceProgramBuckets` logic or omit assertions on the DOM elements.
  - **Consumers:** CI/CD test runner.
- **Definition of done:**
  - [x] Server test suite green: `npx jest --testPathPattern="results.service.spec.ts" --silent --forceExit`.
  - [x] Client test suite green: `npx jest --testPathPattern="result-framework-reporting-card-item" --silent --no-coverage`.
  - [x] All 6 Acceptance Criteria verified.

---

## 4. Dependency graph

```text
RFR-T-1 (Server DTOs & service aggregation)
   │
   └──► RFR-T-2 (Client interface & card component UI)
          │
          └──► RFR-T-3 (Automated test suites & verification)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RFR-TEST-1` | Unit (Server) | `RFR-R-1`, `RFR-R-5`, `RFR-AC-6` | `onecgiar-pr-server/src/api/results/results.service.spec.ts` |
| `RFR-TEST-2` | Unit (Server) | `RFR-R-2`, `RFR-AC-3` | `onecgiar-pr-server/src/api/results/results.service.spec.ts` |
| `RFR-TEST-3` | Component (Client) | `RFR-R-1`, `RFR-R-3`, `RFR-AC-1`, `RFR-AC-2` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.spec.ts` |
| `RFR-TEST-4` | Component (Client) | `RFR-R-4`, `RFR-AC-4` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.spec.ts` |
| `RFR-TEST-5` | Component (Client) | `RFR-R-1`, `RFR-AC-5` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/result-framework-reporting-home/components/result-framework-reporting-card-item/result-framework-reporting-card-item.component.spec.ts` |

---

## 6. Rollout & verification

- [x] Run `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` in `onecgiar-pr-server`.
- [x] Run `npx ng lint --quiet` in `onecgiar-pr-client`.
- [x] Verify `npm run migration:check` is green (no migrations created).
- [x] Verify test suites green in server and client.
- [x] Visual verification on `/result-framework-reporting/home` at default (expanded) and compact view modes.

---

## 7. Roll-back plan

If production requires undoing this change:
1. Revert client template and component changes in `result-framework-reporting-card-item` (restores previous card markup).
2. The server DTO extensions are 100% additive and backward compatible, so server rollback is not strictly required, but can be cleanly reverted via git commit rollback.
