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
      const rows = (await this.dataSource.query(
        query,
        params,
      )) as toc_result_row[];
      return this.groupTocRows(rows);
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
      const rows = (await this.dataSource.query(
        query,
        params,
      )) as toc_result_row[];
      return this.groupTocRows(rows);
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
        0 AS actual_achieved_value_sum,
        '50%' AS progress_percentage,
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
      AND trit.toc_result_indicator_id = tri.toc_result_indicator_id
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
