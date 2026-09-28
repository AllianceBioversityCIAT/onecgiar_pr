// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'node:process';

/**
 * `PTM-T-5` — one ToC indicator row's PORB texts (`design.md` §12 `PTM-DD-2`,
 * `requirements.md` `PTM-R-10`), shaped to feed `/resolve` (Guide §4.2) directly:
 * `program`, `aow` (as `AOW0N: <name>`, `proposal.md` M6), `center`, `hlo_title`,
 * `description`.
 */
export interface PtPorbRow {
  /** The Integration `related_node_id` string — the mapping table's join key (`P-1`, `progress-tracker.service.ts` watch-item decision). */
  tocResultsIndicatorId: string;
  /** The Integration primary key (`toc_results_indicators.id`) — carried for re-resolution, never the lookup key (`design.md` §3.1). */
  tocIndicatorIntegrationId: number | null;
  program: string;
  aow: string;
  center: string;
  hloTitle: string;
  description: string;
}

/**
 * Read-only PORB-text repository for the fill routine (`PTM-R-10`, `PTM-R-12`).
 *
 * Every query below is a `SELECT` against `${env.DB_TOC}` (never a write —
 * `db-toc-write-guard.spec.ts` enforces this repo-wide) joined to the two PRMS-owned
 * CLARISA cache tables that already carry the program name and center label
 * (`clarisa_initiatives`, `clarisa_institutions` — both `env.DB_NAME`, read-only here
 * too). Pattern mirrors `aow-bilateral.repository.ts`'s raw `dataSource.query()` shape
 * (`findIndicatorById`, `:777-788`, cited as this task's exemplar) rather than
 * `TocResultsRepository`, for the same "avoid growing an import cycle for one lookup"
 * reason as `toc-indicator-description-resolver.service.ts`.
 *
 * ⚠️ **Column-level mapping is a documented assumption, not a verified fact** — no
 * database was reachable in this worktree (no `.env`, Docker down) and neither
 * `design.md` nor `requirements.md` pins the exact join at column level; the Guide
 * only names the five PORB texts by their PRMS-visible meaning. Built from the closest
 * verified precedents in this codebase:
 * - `program` — `toc_results.official_code` matched to `clarisa_initiatives.official_code`
 *   for the display name (`clarisa-initiative.entity.ts:19-28`; the same official-code
 *   join `aow-bilateral.repository.ts` uses to scope by science program, e.g.
 *   `findWorkPackagesByProgram`, `:602` `tr.official_code = ?`).
 * - `aow` — `toc_work_packages.acronym` + `.name`, composed as `AOW0N: <name>`
 *   (`proposal.md` M6; join shape from `aow-bilateral.repository.ts:600-604`,
 *   `findWorkPackagesByProgram`).
 * - `hlo_title` — the parent `toc_results.result_title` where `category = 'OUTCOME'`,
 *   the row `tri.toc_results_id` points at — matches this repo's own convention that a
 *   category-`OUTCOME` node is "this HLO" (`aow-bilateral.repository.ts:53-56` doc
 *   comment on `TocResultResponse.progress`, "this HLO's own progress").
 * - `center` — `clarisa_institutions.acronym` via the same
 *   `toc_result_indicator_target` → `toc_result_indicator_target_center` chain
 *   `aow-bilateral.repository.ts:602-606` joins, taking the first center alphabetically
 *   when more than one holds the same target (documented simplification — the Guide's
 *   `/resolve` call takes one `center` string, not a list).
 * - `description` — `toc_results_indicators.indicator_description`, the same column
 *   `toc-indicator-description-resolver.service.ts:54` and
 *   `results.service.ts:3257-3313`'s `getTocMetadata` both read.
 *
 * `PTM-T-5`'s Leader review should treat this file as the place to correct the join if
 * the assumption above is wrong — the resolve service and its tests do not depend on
 * the SQL's precision, only on the shape `{ tocResultsIndicatorId, program, aow,
 * center, hloTitle, description }` being populated from *some* PORB source.
 */
@Injectable()
export class PtPorbRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * All active indicator rows for one ToC reporting phase, optionally narrowed to one
   * program (`design.md` §4.1 `:programId` on the trigger route — name or official
   * code, matched against both `clarisa_initiatives.name` and `.official_code`).
   *
   * `reportingYear` binds the same `wp.year = ?` predicate every cited precedent
   * carries (`aow-bilateral.repository.ts:589-590`, `:915-916`, `:953`) — the version's
   * `phase_year` (`resolveIndicatorMappings`). `aow` is aggregated with `MIN(...)` and
   * dropped from `GROUP BY` **structurally**, not just filtered by year: `toc_id` alone
   * is not unique per `toc_work_packages` row (one row per year), so without the
   * aggregation a `LEFT JOIN` on `toc_id` fans one indicator out into N rows — one per
   * `PTM-T-5` rework attempt-2, Reviewer finding 2 (ADOPTED remediation — aggregation
   * first, year predicate second: a wrong year alone would otherwise only quietly empty
   * `aow` via the `LEFT JOIN`, never break the one-row-per-indicator guarantee `PTM-R-10`
   * needs).
   */
  async findPorbRowsForPhase(
    phaseUuid: string,
    reportingYear: number,
    programId?: string,
  ): Promise<PtPorbRow[]> {
    const params: unknown[] = [reportingYear, phaseUuid];
    let programFilter = '';
    if (programId) {
      programFilter = 'AND (ci_prog.name = ? OR tr.official_code = ?)';
      params.push(programId, programId);
    }

    const query = `
      SELECT
        tri.related_node_id AS toc_results_indicator_id,
        tri.id AS toc_indicator_integration_id,
        COALESCE(ci_prog.name, tr.official_code) AS program,
        MIN(CASE
          WHEN wp.acronym IS NOT NULL AND wp.name IS NOT NULL
            THEN CONCAT(UPPER(TRIM(wp.acronym)), ': ', wp.name)
          ELSE NULL
        END) AS aow,
        MIN(ci.acronym) AS center,
        tr.result_title AS hlo_title,
        tri.indicator_description AS description
      FROM ${env.DB_TOC}.toc_results_indicators tri
      INNER JOIN ${env.DB_TOC}.toc_results tr ON tr.id = tri.toc_results_id
      LEFT JOIN ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
        AND wp.year = ?
      LEFT JOIN ${env.DB_NAME}.clarisa_initiatives ci_prog
        ON ci_prog.official_code = tr.official_code
      LEFT JOIN ${env.DB_TOC}.toc_result_indicator_target trit
        ON trit.id_indicator = tri.id
        AND CONVERT(trit.toc_result_indicator_id USING utf8mb4)
          = CONVERT(tri.related_node_id USING utf8mb4)
      LEFT JOIN ${env.DB_TOC}.toc_result_indicator_target_center tritc
        ON tritc.toc_indicator_target_id = trit.toc_indicator_target_id
      LEFT JOIN ${env.DB_NAME}.clarisa_institutions ci ON ci.id = tritc.center_id
      WHERE tr.phase = ?
        AND tr.is_active = 1
        AND tri.is_active = 1
        AND tri.related_node_id IS NOT NULL
        ${programFilter}
      GROUP BY
        tri.id,
        tri.related_node_id,
        program,
        tr.result_title,
        tri.indicator_description
      ORDER BY tri.id ASC
    `;

    const rows = await this.dataSource.query(query, params);

    return (rows ?? [])
      .filter(
        (row: any) =>
          typeof row?.toc_results_indicator_id === 'string' &&
          row.toc_results_indicator_id.length > 0,
      )
      .map((row: any) => ({
        tocResultsIndicatorId: row.toc_results_indicator_id,
        tocIndicatorIntegrationId:
          row.toc_indicator_integration_id !== null &&
          row.toc_indicator_integration_id !== undefined
            ? Number(row.toc_indicator_integration_id)
            : null,
        program: row.program ?? '',
        aow: row.aow ?? '',
        center: row.center ?? '',
        hloTitle: row.hlo_title ?? '',
        description: row.description ?? '',
      }));
  }
}
