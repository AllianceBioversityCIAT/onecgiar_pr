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
    result_type_id?: number | null;
    result_level_id?: number | null;
  }>;
}

@Injectable()
export class AoWBilateralRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {}

  async findByCompositeCode(
    program: string,
    composite_code: string,
    year?: number,
  ) {
    const params: Array<string | number> = [program, composite_code];

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
        0 AS actual_achieved_value_sum,
        '50%' AS progress_percentage,
        CASE
          WHEN tri.type_value LIKE '%knowledge%' THEN 6
          WHEN tri.type_value LIKE '%innovation%' THEN 7
          ELSE NULL
        END AS result_type_id,
        CAST(4 AS SIGNED) AS result_level_id
      FROM ${env.DB_TOC}.toc_work_packages wp
      JOIN ${env.DB_TOC}.toc_results tr ON tr.wp_id = wp.id
        AND tr.official_code = ?
      JOIN ${env.DB_TOC}.toc_results_indicators tri ON tri.toc_results_id = tr.id
      LEFT JOIN ${env.DB_TOC}.toc_result_indicator_target trit ON tri.id = trit.id_indicator
        AND trit.target_date = ${year}
      WHERE 
        wp.wp_official_code = ?
        AND tr.category = 'OUTPUT'
    `;

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
        tri.location
      ORDER BY tr.id ASC, tri.id ASC
    `;

    try {
      const rows = (await this.dataSource.query(
        query,
        params,
      )) as toc_result_row[];

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
          grouped.get(row.toc_result_id)?.indicators.push({
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
            progress_percentage: row.progress_percentage,
            result_type_id: row.result_type_id
              ? Number(row.result_type_id)
              : null,
            result_level_id: row.result_level_id
              ? Number(row.result_level_id)
              : null,
          });
        }
      }

      return Array.from(grouped.values());
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        error,
        className: AoWBilateralRepository.name,
        debug: true,
      });
    }
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
