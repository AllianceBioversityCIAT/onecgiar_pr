import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'node:process';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import type { ReportingTocContext } from '../../../results-framework-reporting/reporting-toc-context/reporting-toc-context.interface';

interface TocResultRow {
  toc_result_id: number;
  category: string;
  result_title: string;
  related_node_id: string | null;
  indicator_id: number | null;
  indicator_description: string | null;
  toc_result_indicator_id: string | null;
  indicator_related_node_id: string | null;
  unit_messurament: string | null;
  type_value: string | null;
  type_name: string | null;
  location: string | null;
  target_value_sum: number | null;
  actual_achieved_value_sum: number | null;
  progress_percentage: string | null;
  number_target?: string | null;
  target_date?: number | null;
  target_value?: number | null;
  result_type_id?: number | null;
  result_type_name?: string | null;
  result_level_id?: number | null;
}

export interface TocResultResponse {
  toc_result_id: number;
  category: string;
  result_title: string;
  related_node_id: string | null;
  result_level_id?: number | null;
  indicators: Array<{
    indicator_id: number;
    indicator_description: string | null;
    toc_result_indicator_id: string | null;
    related_node_id: string | null;
    unit_messurament: string | null;
    type_value: string | null;
    type_name: string | null;
    location: string | null;
    target_value_sum: number | null;
    actual_achieved_value_sum?: number | null;
    progress_percentage?: string | null;
    number_target?: string | null;
    target_date?: number | null;
    target_value?: number | null;
    result_type_id?: number | null;
    result_type_name?: string | null;
    result_level_id?: number | null;
  }>;
}

interface TocQueryOptions {
  areaAcronym?: string;
  categories?: string[];
  context: ReportingTocContext;
}

export interface TocWorkPackageRow {
  id: number;
  code: string;
  name: string;
  composeCode: string;
  year: number;
}

@Injectable()
export class AoWBilateralRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {}

  private async resolveContext(
    contextOrYear?: ReportingTocContext | number,
  ): Promise<ReportingTocContext> {
    if (
      typeof contextOrYear === 'object' &&
      contextOrYear !== null &&
      typeof contextOrYear.phaseUuid === 'string'
    ) {
      return contextOrYear;
    }

    const hasYearOverride = typeof contextOrYear === 'number';
    const query = `
      SELECT
        v.phase_year,
        v.toc_pahse_id
      FROM ${env.DB_NAME}.version v
      WHERE
        v.is_active = 1
        AND v.status = 1
        AND v.app_module_id = 1
        ${hasYearOverride ? 'AND v.phase_year = ?' : ''}
      LIMIT 1
    `;
    const rows = await this.dataSource.query(
      query,
      hasYearOverride ? [contextOrYear] : [],
    );
    const row = rows?.[0];
    const phaseUuid =
      typeof row?.toc_pahse_id === 'string' ? row.toc_pahse_id : '';
    const reportingYear = Number(
      hasYearOverride ? contextOrYear : row?.phase_year,
    );

    if (!phaseUuid || !Number.isFinite(reportingYear)) {
      throw this._handlersError.returnErrorRepository({
        error: 'Missing TOC phase context for reporting queries',
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }

    return { reportingYear, phaseUuid };
  }

  private resolveAreaAcronym(program: string, compositeCode: string): string {
    const normalizedProgram = program.trim().toUpperCase();
    const normalizedComposite = compositeCode.trim().toUpperCase();
    const prefix = `${normalizedProgram}-`;

    return normalizedComposite.startsWith(prefix)
      ? normalizedComposite.slice(prefix.length)
      : normalizedComposite;
  }

  // Backward-compatible helper used by legacy tests and call sites.
  private async getCurrentTocPhaseId(): Promise<string | null> {
    try {
      const context = await this.resolveContext();
      return context.phaseUuid;
    } catch (error) {
      this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
      return null;
    }
  }

  /**
   * Returns active work packages linked to OUTPUT/OUTCOME ToC nodes
   * for the requested program, constrained by reporting phase and year.
   *
   * Prefers clarisa wp metadata when a clarisa row exists for the acronym;
   * otherwise falls back to local wp rows (e.g. SP02 boards synced as local only).
   */
  async findWorkPackagesByProgram(
    programOfficialCode: string,
    context: ReportingTocContext,
  ): Promise<TocWorkPackageRow[]> {
    const query = `
      SELECT
        UPPER(TRIM(wp.acronym)) AS code,
        COALESCE(MAX(cw.toc_id), MAX(wp.toc_id)) AS id,
        COALESCE(MAX(cw.name), MAX(wp.name)) AS name,
        COALESCE(MAX(cw.wp_official_code), MAX(wp.wp_official_code)) AS composeCode,
        MAX(wp.year) AS year
      FROM ${env.DB_TOC}.toc_work_packages wp
      INNER JOIN ${env.DB_TOC}.toc_results tr ON tr.wp_id = wp.toc_id
      LEFT JOIN ${env.DB_TOC}.toc_work_packages cw
        ON UPPER(TRIM(cw.acronym)) = UPPER(TRIM(wp.acronym))
        AND cw.year = wp.year
        AND LOWER(TRIM(cw.source)) = 'clarisa'
        AND cw.wp_official_code LIKE CONCAT(?, '-%')
      WHERE tr.official_code = ?
        AND tr.phase = ?
        AND tr.is_active = 1
        AND tr.category IN ('OUTPUT', 'OUTCOME')
        AND wp.year = ?
        AND wp.wp_official_code LIKE CONCAT(?, '-%')
      GROUP BY UPPER(TRIM(wp.acronym))
      ORDER BY code ASC
    `;

    try {
      const rows = await this.dataSource.query(query, [
        programOfficialCode,
        programOfficialCode,
        context.phaseUuid,
        context.reportingYear,
        programOfficialCode,
      ]);
      return (rows ?? []).map((row: any) => ({
        id: Number(row.id),
        code: row.code,
        name: row.name,
        composeCode: row.composeCode,
        year: Number(row.year),
      }));
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  async findUnitAcronymsByProgram(
    programOfficialCode: string,
    contextOrYear?: ReportingTocContext | number,
  ): Promise<Set<string>> {
    try {
      const context = await this.resolveContext(contextOrYear);
      const workPackages = await this.findWorkPackagesByProgram(
        programOfficialCode,
        context,
      );
      const acronyms = new Set<string>();
      for (const row of workPackages) {
        const value = row?.code?.trim();
        if (value) acronyms.add(value.toUpperCase());
      }
      return acronyms;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  async findByCompositeCode(
    program: string,
    composite_code: string,
    contextOrYear: ReportingTocContext | number,
  ) {
    const context = await this.resolveContext(contextOrYear);
    const areaAcronym = this.resolveAreaAcronym(program, composite_code);
    const { query, params } = this.buildTocQuery(program, {
      areaAcronym,
      categories: ['OUTPUT', 'OUTCOME'],
      context,
    });

    try {
      const [rows, contributions] = await Promise.all([
        this.dataSource.query(query, params) as Promise<TocResultRow[]>,
        this.getIndicatorContributions(program, context),
      ]);

      const enhancedRows = rows.map((row) => ({
        ...row,
        actual_achieved_value_sum:
          contributions.get(row.indicator_id)?.actual_achieved_value_sum ?? 0,
        progress_percentage:
          contributions.get(row.indicator_id)?.progress_percentage ?? '0%',
      }));

      return this.groupTocRows(enhancedRows);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  async find2030Outcomes(
    program: string,
    contextOrYear: ReportingTocContext | number,
  ) {
    const context = await this.resolveContext(contextOrYear);
    const { query, params } = this.buildTocQuery(program, {
      categories: ['EOI'],
      context,
    });

    try {
      const [rows, contributions] = await Promise.all([
        this.dataSource.query(query, params) as Promise<TocResultRow[]>,
        this.getIndicatorContributions(program, context),
      ]);

      const enhancedRows = rows.map((row) => ({
        ...row,
        actual_achieved_value_sum:
          contributions.get(row.indicator_id)?.actual_achieved_value_sum ?? 0,
        progress_percentage:
          contributions.get(row.indicator_id)?.progress_percentage ?? '0%',
      }));

      return this.groupTocRows(enhancedRows);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  private buildTocQuery(
    program: string,
    options: TocQueryOptions,
  ): { query: string; params: Array<string | number> } {
    const categories =
      options.categories && options.categories.length > 0
        ? options.categories
        : ['OUTPUT', 'OUTCOME'];

    const params: Array<string | number> = [];
    const categoryPlaceholders = categories.map(() => '?').join(', ');

    let query = `
      SELECT
        tr.id as toc_result_id,
        tr.category,
        tr.result_title AS result_title,
        tr.related_node_id AS related_node_id,
        tri.id AS indicator_id,
        tri.indicator_description,
        tri.toc_result_indicator_id,
        tri.related_node_id AS indicator_related_node_id,
        tri.unit_messurament AS unit_messurament,
        tri.type_value,
        NULLIF(TRIM(tri.type_name), '') AS type_name,
        tri.location,
        COALESCE(SUM(CAST(trit.target_value AS SIGNED)), 0) AS target_value_sum,
        trit.number_target,
        trit.target_date,
        trit.target_value,
        CASE
          WHEN tri.type_value LIKE '%Number of Policy%' THEN 1
          WHEN tri.type_value LIKE '%Innovation Use%' THEN 2
          WHEN tri.type_value LIKE '%Number of people trained (capacity sharing for development)%' THEN 5
          WHEN tri.type_value LIKE '%Number of knowledge products%' THEN 6
          WHEN tri.type_value LIKE '%Number of innovations (innovation development)%' THEN 7
          ELSE NULL
        END AS result_type_id,
        (SELECT rt.name
         FROM ${env.DB_NAME}.result_type rt
         WHERE rt.id = CASE
           WHEN tri.type_value LIKE '%Number of Policy%' THEN 1
           WHEN tri.type_value LIKE '%Innovation Use%' THEN 2
           WHEN tri.type_value LIKE '%Number of people trained (capacity sharing for development)%' THEN 5
           WHEN tri.type_value LIKE '%Number of knowledge products%' THEN 6
           WHEN tri.type_value LIKE '%Number of innovations (innovation development)%' THEN 7
           ELSE NULL
         END) AS result_type_name,
        CASE
          WHEN tr.category = 'OUTCOME' THEN 3
          WHEN tr.category = 'OUTPUT' THEN 4
          WHEN tr.category = 'EOI' THEN 3
          ELSE NULL
        END AS result_level_id
      FROM ${env.DB_TOC}.toc_results tr
    `;

    if (options.areaAcronym) {
      query += `
        JOIN ${env.DB_TOC}.toc_work_packages wp ON tr.wp_id = wp.toc_id
          AND wp.year = ?
          AND UPPER(TRIM(wp.acronym)) = ?
          AND wp.wp_official_code LIKE CONCAT(?, '-%')
      `;
      params.push(
        options.context.reportingYear,
        options.areaAcronym.trim().toUpperCase(),
        program.trim().toUpperCase(),
      );
    }

    query += `
      LEFT JOIN ${env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
        AND tri.is_active = 1
      LEFT JOIN ${env.DB_TOC}.toc_result_indicator_target trit ON tri.id = trit.id_indicator
        AND CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
        AND trit.target_date = ?
    `;
    params.push(options.context.reportingYear);

    query += `
      WHERE
        tr.official_code = ?
        AND tr.category IN (${categoryPlaceholders})
        AND tr.is_active = 1
    `;
    params.push(program, ...categories);
    query += ` AND tr.phase = ?`;
    params.push(options.context.phaseUuid);

    query += `
      GROUP BY
        tr.id,
        tr.category,
        tr.result_title,
        tr.related_node_id,
        tri.id,
        tri.indicator_description,
        tri.toc_result_indicator_id,
        tri.related_node_id,
        tri.unit_messurament,
        tri.type_value,
        tri.type_name,
        tri.location,
        trit.number_target,
        trit.target_date,
        trit.target_value
      ORDER BY tr.id ASC, tri.id ASC
    `;

    return { query, params };
  }

  private groupTocRows(rows: TocResultRow[]): TocResultResponse[] {
    const grouped = new Map<number, TocResultResponse>();

    for (const row of rows) {
      if (!grouped.has(row.toc_result_id)) {
        grouped.set(row.toc_result_id, {
          toc_result_id: row.toc_result_id,
          category: row.category,
          result_title: row.result_title,
          related_node_id: row.related_node_id,
          result_level_id: row.result_level_id ?? null,
          indicators: [],
        });
      }

      if (row.indicator_id !== null) {
        const indicator: TocResultResponse['indicators'][number] = {
          indicator_id: row.indicator_id,
          indicator_description: row.indicator_description,
          toc_result_indicator_id: row.toc_result_indicator_id,
          related_node_id: row.indicator_related_node_id,
          unit_messurament: row.unit_messurament,
          type_value: row.type_value,
          type_name: row.type_name,
          location: row.location,
          target_value_sum: row.target_value_sum,
          actual_achieved_value_sum: row.actual_achieved_value_sum,
          number_target: row.number_target,
          target_date: row.target_date,
          target_value: row.target_value,
          progress_percentage: row.progress_percentage,
          result_level_id: row.result_level_id ?? null,
          result_type_id: row.result_type_id ?? null,
          result_type_name: row.result_type_name ?? null,
        };

        grouped.get(row.toc_result_id)?.indicators.push(indicator);
      }
    }

    return Array.from(grouped.values());
  }

  async findResultById(tocResultId: number, phaseUuid: string) {
    const query = `
      SELECT
        tr.id,
        tr.result_title,
        tr.category
      FROM ${env.DB_TOC}.toc_results tr
      WHERE tr.id = ?
      AND tr.phase = ?
      LIMIT 1;
    `;

    try {
      const rows = await this.dataSource.query(query, [tocResultId, phaseUuid]);
      return rows?.[0] ?? null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  async findIndicatorById(indicatorId: number) {
    const query = `
      SELECT
        tri.id,
        tri.toc_results_id,
        tri.toc_result_indicator_id,
        tri.related_node_id
      FROM ${env.DB_TOC}.toc_results_indicators tri
      WHERE tri.id = ?
      AND tri.is_active = 1
      LIMIT 1;
    `;

    try {
      const rows = await this.dataSource.query(query, [indicatorId]);
      return rows?.[0] ?? null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  private calculateProgressPercentage(
    targetValue: number,
    actualValue: number,
  ): number {
    if (targetValue > 0) {
      return (actualValue / targetValue) * 100;
    }
    if (targetValue === 0 && actualValue > 0) {
      return actualValue * 100;
    }
    return 0;
  }

  private formatProgressPercentage(progressPercentage: number): string {
    const progressRounded = Math.round(progressPercentage * 10) / 10;
    if (!Number.isFinite(progressRounded)) {
      return '0%';
    }
    if (Number.isInteger(progressRounded)) {
      return `${progressRounded.toFixed(0)}%`;
    }
    return `${progressRounded.toFixed(1)}%`;
  }

  private mapIndicatorContributionRow(row: {
    indicator_id: number;
    target_value_sum: unknown;
    actual_achieved_value_sum: unknown;
    work_package_acronym: unknown;
  }) {
    const targetValue = Number(row.target_value_sum) || 0;
    const actualValue = Number(row.actual_achieved_value_sum) || 0;

    return {
      target_value_sum: targetValue,
      actual_achieved_value_sum: actualValue,
      work_package_acronym:
        typeof row.work_package_acronym === 'string'
          ? row.work_package_acronym
          : null,
      progress_percentage: this.formatProgressPercentage(
        this.calculateProgressPercentage(targetValue, actualValue),
      ),
    };
  }

  async getIndicatorContributions(
    program: string,
    contextOrYear?: ReportingTocContext | number,
  ) {
    const context = await this.resolveContext(contextOrYear);
    const params: (string | number)[] = [];

    const query = `
      SELECT
        tgt.indicator_id,
        tgt.toc_result_indicator_id,
        tgt.target_value_sum,
        tgt.work_package_acronym,
        COALESCE(act.actual_achieved_value_sum, 0) AS actual_achieved_value_sum
      FROM (
        SELECT
          tri.id AS indicator_id,
          tri.toc_result_indicator_id,
          COALESCE(SUM(CAST(trit.target_value AS DECIMAL(15,2))), 0) AS target_value_sum,
          UPPER(TRIM(wp.acronym)) AS work_package_acronym
        FROM ${env.DB_TOC}.toc_results tr
        JOIN ${env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
        JOIN ${env.DB_TOC}.toc_result_indicator_target trit ON tri.id = trit.id_indicator
          AND CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
          AND trit.target_date = ?
        LEFT JOIN ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
          AND wp.year = ?
        WHERE
          tr.official_code = ?
          AND tri.is_active = 1
          AND tr.phase = ?
        GROUP BY
          tri.id,
          tri.toc_result_indicator_id,
          wp.acronym
      ) AS tgt
      LEFT JOIN (
        SELECT
          tri.id AS indicator_id,
          COALESCE(SUM(CAST(rit.contributing_indicator AS DECIMAL(15,2))), 0) AS actual_achieved_value_sum
        FROM ${env.DB_NAME}.result r
        LEFT JOIN ${env.DB_NAME}.results_toc_result rtr ON rtr.results_id = r.id
          AND rtr.is_active = 1
        LEFT JOIN ${env.DB_NAME}.results_toc_result_indicators rtri ON rtri.results_toc_results_id = rtr.result_toc_result_id
          AND rtri.is_active = 1
          AND rtri.is_not_aplicable = 0
        LEFT JOIN ${env.DB_NAME}.result_indicators_targets rit ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
          AND rit.is_active = 1
          AND rit.contributing_indicator IS NOT NULL
          AND rit.target_date = ?
        JOIN ${env.DB_TOC}.toc_results tr ON tr.id = rtr.toc_result_id
        JOIN ${env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
          AND tri.is_active = 1
          AND CONVERT(rtri.toc_results_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
        LEFT JOIN ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
          AND wp.year = ?
        WHERE
          tr.official_code = ?
          AND r.is_active = 1
          /* P2-2841: Quality Assessed (2) + Approved (6) only — aligns with View results */
          AND r.status_id IN (2, 6)
          AND r.result_level_id IN (3, 4)
          AND r.result_type_id IN (1, 2, 4, 5, 6, 7, 8, 10)
          AND tr.phase = ?
        GROUP BY
          tri.id
      ) AS act ON act.indicator_id = tgt.indicator_id
    `;
    params.push(
      context.reportingYear,
      context.reportingYear,
      program,
      context.phaseUuid,
      context.reportingYear,
      context.reportingYear,
      program,
      context.phaseUuid,
    );

    try {
      const rows = await this.dataSource.query(query, params);
      const contributionsMap = new Map<
        number,
        {
          target_value_sum: number;
          actual_achieved_value_sum: number;
          work_package_acronym: string | null;
          progress_percentage: string;
        }
      >();

      for (const row of rows) {
        contributionsMap.set(
          row.indicator_id,
          this.mapIndicatorContributionRow(row),
        );
      }

      return contributionsMap;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  async findBilateralProjectById(tocResultId: number, phaseUuid: string) {
    const query = `
      SELECT
        tr.id AS toc_result_id,
        tr.official_code AS official_code,
        trp.project_id AS project_id, 
        trp.name AS project_name,
        trp.project_summary AS project_summary,
        cp.organization_code AS organization_code,
        ci.id AS organization_id,
        ci.name AS organization_name,
        ci.acronym AS organization_acronym,
        ci.website_link AS organization_website_link
      FROM ${env.DB_TOC}.toc_results tr
      JOIN ${env.DB_TOC}.toc_result_projects trp ON trp.toc_result_id_toc = tr.related_node_id
      LEFT JOIN clarisa_projects cp ON cp.id = trp.project_id
      LEFT JOIN clarisa_institutions ci ON ci.id = cp.organization_code
      WHERE tr.id = ?
        AND tr.phase = ?
    `;

    try {
      return await this.dataSource.query(query, [tocResultId, phaseUuid]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }

  /**
   * Get all targets for an indicator across all years with their contributing centers
   * @param indicatorId The indicator ID from toc_results_indicators
   * @returns Array of targets with their centers
   */
  async findTargetsWithCentersByIndicatorId(indicatorId: number) {
    const query = `
      SELECT
        trit.toc_indicator_target_id,
        trit.target_date AS year,
        trit.target_value,
        trit.number_target,
        tritc.center_id,
        ci.acronym AS center_acronym,
        ci.name AS center_name
      FROM ${env.DB_TOC}.toc_result_indicator_target trit
      LEFT JOIN ${env.DB_TOC}.toc_result_indicator_target_center tritc 
        ON trit.toc_indicator_target_id = tritc.toc_indicator_target_id
      LEFT JOIN ${env.DB_NAME}.clarisa_institutions ci 
        ON tritc.center_id = ci.id
      WHERE trit.id_indicator = ?
        AND trit.target_date >= 2025
      ORDER BY trit.target_date ASC, ci.acronym ASC
    `;

    try {
      const rows = await this.dataSource.query(query, [indicatorId]);

      // Group by target_id to consolidate centers
      const targetsMap = new Map<
        number,
        {
          toc_indicator_target_id: number;
          year: number;
          target_value: number;
          number_target: string;
          centers: Array<{
            center_id: number;
            center_acronym: string;
            center_name: string;
          }>;
        }
      >();

      for (const row of rows) {
        const targetId = row.toc_indicator_target_id;

        if (!targetsMap.has(targetId)) {
          targetsMap.set(targetId, {
            toc_indicator_target_id: targetId,
            year: row.year,
            target_value: row.target_value,
            number_target: row.number_target,
            centers: [],
          });
        }

        // Add center if exists
        if (row.center_id) {
          targetsMap.get(targetId).centers.push({
            center_id: row.center_id,
            center_acronym: row.center_acronym,
            center_name: row.center_name,
          });
        }
      }

      return Array.from(targetsMap.values());
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }
}
