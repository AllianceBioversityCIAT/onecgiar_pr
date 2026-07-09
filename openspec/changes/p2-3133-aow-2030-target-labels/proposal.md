## Why

In the **2030 Outcomes** view (Areas of Work → 2030 Outcomes), the indicator table incorrectly shows the active reporting-phase year in the target column (e.g. "2026 target") and the backend returns a **single-year** `target_value_sum`. Product confirmed (**P2-3133**) that 2030 Outcomes is a cumulative view: the column must read **"2030 target"** and `target_value_sum` must be the sum of targets from **2025 through 2030**. Separately, the shared table label "Achieved target" is renamed to **"Achieved value"** across all AoW views.

Normal HLO / Intermediate Outcomes views remain unchanged: they keep `{phaseYear} target` with single-year values.

## What Changes

- **Frontend (2030 Outcomes only):** In `aow-hlo-table` when `tableType === '2030-outcomes'`, column title is the fixed label **"2030 target"** instead of `{reportingPhaseYear} target`.
- **Frontend (all AoW table views):** Rename column **"Achieved target"** → **"Achieved value"** in the main table and the view-results drawer.
- **Backend (2030 Outcomes endpoint only):** In `AoWBilateralRepository.find2030Outcomes` / `buildTocQuery`, sum `target_value` for `target_date` **BETWEEN 2025 AND 2030** (inclusive). Recalculate `progress_percentage` against that cumulative target.
- **Tests:** Update `aow-hlo-table.component.spec.ts`, `aow-view-results-drawer.component.spec.ts`, and `aow-bilateral.repository.spec.ts`.

## Capabilities

### New Capabilities
- `aow-2030-cumulative-targets`: 2030 Outcomes API and UI show cumulative 2025–2030 targets with a fixed "2030 target" column label.

### Modified Capabilities
- `reporting-phase-year-display`: 2030 Outcomes is exempt from the dynamic `{year} target` column; outputs/outcomes unchanged.

## Impact

- **Full-stack** (`onecgiar-pr-client` + `onecgiar-pr-server`):
  - Client: `aow-hlo-table.component.ts` (+ `.spec.ts`), `aow-view-results-drawer.component.ts` (+ `.spec.ts`)
  - Server: `aow-bilateral.repository.ts` (+ `.spec.ts`)
- **API:** `GET /api/results-framework-reporting/toc-results/2030-outcomes` — `target_value_sum` and `progress_percentage` semantics change for 2030 Outcomes only. No schema/migration changes.
- **Unchanged:** `findByCompositeCode` (HLO / Intermediate Outcomes), contributions query, other endpoints.
- SDD baseline: `docs/system-design/design.md` (Result Framework AoW views), `docs/detailed-design/detailed-design.md` (results-framework-reporting module).
