import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'process';
import { HandlersError } from '../../../../shared/handlers/error.utils';

interface toc_result_row {
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
  result_type_id?: number | null;
  result_level_id?: number | null;
}

export interface toc_result_response {
  toc_result_id: number;
  category: string;
  result_title: string;
  related_node_id: string | null;
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
    result_type_id?: number | null;
    result_level_id?: number | null;
  }>;
}

interface TocQueryOptions {
  compositeCode?: string;
  categories?: string[];
  year?: number;
}

@Injectable()
export class AoWBilateralRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {}

  /**
   * Returns the distinct list of work package acronyms (unit codes) registered in the
   * ToC catalogue for the provided program (initiative official code).
   *
   * Mapping context requested:
   *  code (unit code) = acronym (toc_work_packages.acronym)
   *  programId = initiativeId / program official code (toc_results.official_code)
   */
  async findUnitAcronymsByProgram(
    programOfficialCode: string,
  ): Promise<Set<string>> {
    const query = `
      SELECT DISTINCT wp.acronym
      FROM ${env.DB_TOC}.toc_work_packages wp
      INNER JOIN ${env.DB_TOC}.toc_results tr ON tr.wp_id = wp.toc_id
        AND tr.official_code = ?
    `;

    try {
      const rows = await this.dataSource.query(query, [programOfficialCode]);
      const acronyms = new Set<string>();
      for (const row of rows || []) {
        const value = row?.acronym?.trim();
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
    year?: number,
  ) {
    const { query, params } = this.buildTocQuery(program, {
      compositeCode: composite_code,
      year,
      categories: ['OUTPUT', 'OUTCOME'],
    });

    try {
      const [rows, contributions] = await Promise.all([
        this.dataSource.query(query, params) as Promise<toc_result_row[]>,
        this.getIndicatorContributions(program, year),
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

  async find2030Outcomes(program: string, year?: number) {
    const { query, params } = this.buildTocQuery(program, {
      year,
      categories: ['EOI'],
    });

    try {
      const [rows, contributions] = await Promise.all([
        this.dataSource.query(query, params) as Promise<toc_result_row[]>,
        this.getIndicatorContributions(program, year),
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
        tri.type_name,
        tri.location,
        COALESCE(SUM(CAST(trit.target_value AS SIGNED)), 0) AS target_value_sum,
        trit.number_target,
        trit.target_date,
        CASE
          WHEN tri.type_value LIKE '%Number of Policy%' THEN 1
          WHEN tri.type_value LIKE '%Innovation Use%' THEN 2
          WHEN tri.type_value LIKE '%Number of people trained (capacity sharing for development)%' THEN 5
          WHEN tri.type_value LIKE '%Number of knowledge products%' THEN 6
          WHEN tri.type_value LIKE '%Number of innovations (innovation development)%' THEN 7
          ELSE NULL
        END AS result_type_id,
        CASE
          WHEN tr.category = 'OUTCOME' THEN 3
          WHEN tr.category = 'OUTPUT' THEN 4
          WHEN tr.category = 'EOI' THEN 3
          ELSE NULL
        END AS result_level_id
      FROM ${env.DB_TOC}.toc_results tr
    `;

    if (options.compositeCode) {
      query += `
        JOIN ${env.DB_TOC}.toc_work_packages wp ON tr.wp_id = wp.toc_id
          AND wp.wp_official_code = ?
      `;
      params.push(options.compositeCode);
    }

    query += `
      JOIN ${env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
      JOIN ${env.DB_TOC}.toc_result_indicator_target trit ON tri.id = trit.id_indicator
      AND CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.toc_result_indicator_id USING utf8mb4)
    `;

    if (options.year !== undefined) {
      query += ` AND trit.target_date = ?`;
      params.push(options.year);
    }

    query += `
      WHERE
        tr.official_code = ?
        AND tr.category IN (${categoryPlaceholders})
        AND tri.is_active = 1
    `;
    params.push(program);
    params.push(...categories);

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
        trit.target_date
      ORDER BY tr.id ASC, tri.id ASC
    `;

    return { query, params };
  }

  private groupTocRows(rows: toc_result_row[]): toc_result_response[] {
    const grouped = new Map<number, toc_result_response>();

    for (const row of rows) {
      if (!grouped.has(row.toc_result_id)) {
        grouped.set(row.toc_result_id, {
          toc_result_id: row.toc_result_id,
          category: row.category,
          result_title: row.result_title,
          related_node_id: row.related_node_id,
          indicators: [],
        });
      }

      if (row.indicator_id !== null) {
        const indicator: toc_result_response['indicators'][number] = {
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
          progress_percentage: row.progress_percentage,
          result_level_id: row.result_level_id ?? null,
          result_type_id: row.result_type_id ?? null,
        };

        grouped.get(row.toc_result_id)?.indicators.push(indicator);
      }
    }

    return Array.from(grouped.values());
  }

  async findResultById(tocResultId: number) {
    const query = `
      SELECT
        tr.id,
        tr.result_title
      FROM ${env.DB_TOC}.toc_results tr
      WHERE tr.id = ?
      LIMIT 1;
    `;

    try {
      const rows = await this.dataSource.query(query, [tocResultId]);
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

  async getIndicatorContributions(program: string, year?: number) {
    const params: Array<string | number> = [];

    const targetYearCondition =
      year !== undefined ? ' AND trit.target_date = ?' : '';
    const actualYearCondition =
      year !== undefined ? ' AND rit.target_date = ?' : '';

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
          AND CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.toc_result_indicator_id USING utf8mb4)
          ${targetYearCondition}
        LEFT JOIN ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
        WHERE
          tr.official_code = ?
          AND tri.is_active = 1
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
          ${actualYearCondition}
        JOIN ${env.DB_TOC}.toc_results tr ON tr.id = rtr.toc_result_id
        JOIN ${env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
          AND tri.is_active = 1
          AND CONVERT(rtri.toc_results_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
        LEFT JOIN ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
        WHERE
          tr.official_code = ?
          AND r.is_active = 1
          AND r.status_id IN (1, 2, 3)
          AND r.result_level_id IN (3, 4)
          AND r.result_type_id IN (1, 2, 4, 5, 6, 7, 8)
        GROUP BY
          tri.id
      ) AS act ON act.indicator_id = tgt.indicator_id
    `;
    if (year !== undefined) {
      params.push(year);
    }
    params.push(program);
    if (year !== undefined) {
      params.push(year);
    }
    params.push(program);

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
        const targetValue = Number(row.target_value_sum) || 0;
        const actualValue = Number(row.actual_achieved_value_sum) || 0;
        let progressPercentage = 0;
        if (targetValue > 0) {
          progressPercentage = (actualValue / targetValue) * 100;
        } else if (targetValue === 0 && actualValue > 0) {
          progressPercentage = actualValue * 100;
        }
        const progressRounded = Math.round(progressPercentage * 10) / 10;
        const isWholeNumber = Number.isFinite(progressRounded)
          ? Number.isInteger(progressRounded)
          : false;
        const formattedProgress = Number.isFinite(progressRounded)
          ? `${isWholeNumber ? progressRounded.toFixed(0) : progressRounded.toFixed(1)}%`
          : '0%';

        contributionsMap.set(row.indicator_id, {
          target_value_sum: targetValue,
          actual_achieved_value_sum: actualValue,
          work_package_acronym:
            typeof row.work_package_acronym === 'string'
              ? row.work_package_acronym
              : null,
          progress_percentage: formattedProgress,
        });
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

  async findBilateralProjectById(tocResultId: number) {
    const query = `
      SELECT
        tr.id AS toc_result_id,
        tr.official_code AS official_code,
        trp.project_id AS project_id, 
        trp.name AS project_name,
        trp.project_summary AS project_summary
      FROM ${env.DB_TOC}.toc_results tr
      JOIN ${env.DB_TOC}.toc_result_projects trp ON trp.toc_result_id_toc = tr.related_node_id
      WHERE tr.id = ?
    `;

    try {
      return this.dataSource.query(query, [tocResultId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
  }
}
