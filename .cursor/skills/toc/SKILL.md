---
name: toc
description: >-
  Guides Theory of Change (ToC) work in onecgiar_pr—prdb link tables, external
  Integration_information / env.DB_TOC schema, per-result and per-initiative ToC
  mapping, indicators, planned vs actual, work packages, and P22/P25 reporting
  SQL. Use when implementing or changing ToC mapping, indicators, IPSR pathway
  ToC references, or reports that join results to toc_results.
---

# Theory of Change (ToC) — Agent Guide

Use this skill when implementing or changing **ToC** logic: result–ToC node mapping, indicators, planned vs actual, work packages, or reports that consume ToC (for example P22 / P25 patterns in `result.repository.ts`).

## Two data sources for ToC

1. **Project database (prdb):** tables that link **results** to ToC nodes and selected indicators (`results_toc_result`, `results_toc_result_indicators`, related target tables).
2. **External schema:** `Integration_information` and/or `${env.DB_TOC}` (naming varies by query). ToC tree nodes and metadata live there: `toc_results`, work-package tables, `toc_results_indicators`, etc. These are **not** assumed to be TypeORM entities in this repo; code often uses **raw SQL** or repositories that interpolate the schema name.

Always align table and column names with **existing queries and repositories**, not assumptions.

## Prdb tables — Result ↔ ToC

| Table | Role | Main FKs |
|-------|------|-----------|
| `results_toc_result` | One row = one **result** mapped to one **ToC node** for one **initiative**. | `results_id` → result, `toc_result_id` → external `toc_results.id`, `initiative_id` → initiative |
| `results_toc_result_indicators` | ToC indicators selected for that result–ToC row. | `results_toc_results_id` → `results_toc_result.result_toc_result_id`, `toc_results_indicator_id` → external indicator id |
| `result_indicators_targets` | Targets / values per indicator (`number_target`, `contributing_indicator`, etc.). | Links via result–ToC indicator row (see entity / repo) |
| `result_toc_impact_area_target` | Impact area (Clarisa) linkage. | `result_toc_result_id` |
| `result_toc_sdg_targets` | SDG target linkage (`clarisa_sdgs_targets`). | `result_toc_result_id` |
| `result_toc_action_area` | Action area outcome linkage. | `result_toc_result_id` |

**PK** of `results_toc_result`: `result_toc_result_id`. Useful columns include `toc_result_id`, `results_id`, `initiative_id`, `planned_result`, `toc_progressive_narrative`, `toc_level_id`, `action_area_id`, `is_active`.

## Initiative relationship

- Each `results_toc_result` row is: result **R** mapped to ToC node **N** for initiative **I**.
- For lead vs contributing initiative roles, join initiative linkage tables used in reporting (often `results_by_inititiative` — **note the schema spelling** — with `initiative_role_id` such as 1 = lead, 2 = contributing) and `clarisa_initiatives` / equivalents as in existing SQL.
- **P22-style** reporting often groups by initiative (primary / secondary), surfacing work package, title, description, indicators, impact area, SDG, action area, narrative.

## External schema (`Integration_information` / `DB_TOC`)

Referenced in SQL as `Integration_information.toc_results`, `Integration_information.work_packages`, `${env.DB_TOC}.toc_results`, `${env.DB_TOC}.toc_work_packages`, etc., depending on report or environment.

- **`toc_results`:** ToC tree nodes; ids match `results_toc_result.toc_result_id`. Typical fields include titles, descriptions, and work-package foreign keys (exact column names vary—follow live queries).
- **Work packages:** joined from `toc_results` (patterns include `work_packages`, `toc_work_packages`, and `wp_id` vs `work_packages_id` depending on query—**verify the specific JOIN** in the file you are editing).
- **`toc_results_indicators`:** indicators for a node; joined by `toc_results_id` (and sometimes `related_node_id` / indicator id columns). Prdb `results_toc_result_indicators.toc_results_indicator_id` points into this layer.
- Other satellite tables may appear: country/region/target breakdowns for indicators—only add joins when an existing report or requirement uses them.

Do **not** assume TypeORM entities exist for external-schema tables unless you find them.

## Indicators: planned vs actual

- **Planned:** `results_toc_result.planned_result` (boolean); reports often label this as “Is planned: Yes/No”.
- **Indicators in use:** via `results_toc_result_indicators` plus external `toc_results_indicators` for labels and metadata.
- **Actual / achieved:** `result_indicators_targets.contributing_indicator` (and related narrative fields where present).

For “indicator_used” and “actual_achieved” style outputs, chain `results_toc_result` → `results_toc_result_indicators` → external `toc_results_indicators` and `result_indicators_targets` as in existing report SQL.

## Innovation packages (pathway)

- Innovation packages (**IP**, `result_type_id = 10`) can store a **pathway** (EOI, action area, impact, SDG) at **result-by-innovation-package** level (`result_ip_eoi_outcomes`, `result_ip_action_area_outcome`, etc.), referencing `Integration_information.toc_results` via `toc_result_id`. That is **IP pathway**, distinct from the classic **per-initiative** `results_toc_result` mapping.
- **Result-level “toc mapping”** for a result (IP or not) still flows through `results_toc_result` + external `toc_results` + work packages **by initiative** where applicable.

## Reports and SQL

- **P25 / P22 patterns:** large ToC joins and CTE-style logic for reporting live primarily in `onecgiar-pr-server/src/api/results/result.repository.ts` (search for `Integration_information`, `DB_TOC`, `toc_results`, P22/P25-related methods).
- Prefer **filtering** `results_toc_result.is_active = 1` and, when relevant, `results_toc_result_indicators.is_active = 1`, consistent with existing queries.

## Where the code lives

- **TypeORM entities (prdb ToC):** `onecgiar-pr-server/src/api/results/results-toc-results/entities/` — e.g. `results-toc-result.entity.ts`, `results-toc-results-indicators.entity.ts`, `result-toc-result-target-indicators.entity.ts`, `result-toc-impact-area-target.entity.ts`, `result-toc-sdg-target.entity.ts`, `result-toc-action-area.entity.ts`.
- **Repositories / raw queries:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/`, plus `onecgiar-pr-server/src/api/results/result.repository.ts` for cross-cutting report SQL.
- **IP pathway (ToC ids on pathway tables):** `onecgiar-pr-server/src/api/ipsr/innovation-pathway/` (entities under `entities/`, data access under `repository/`).

## Additional reference

For deeper table-by-table notes or examples copied from internal docs, extend [reference.md](reference.md) in this folder and link new sections from here (keep links **one level deep** from `SKILL.md`).
