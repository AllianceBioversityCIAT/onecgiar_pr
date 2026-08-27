import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultsInnovationsUse } from '../entities/results-innovations-use.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsInnovationsUseRepository
  extends BaseRepository<ResultsInnovationsUse>
  implements LogicalDelete<ResultsInnovationsUse>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsInnovationsUse>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `select 
      null as result_innovation_use_id,
      riu.male_using,
      riu.female_using,
      riu.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as results_id,
      ${config.user.id} as created_by,
      null as last_updated_by
      from results_innovations_use riu where riu.results_id = ${
        config.old_result_id
      } and riu.is_active > 0`,
      insertQuery: `insert into results_innovations_use
      (
      male_using,
      female_using,
      is_active,
      created_date,
      last_updated_date,
      results_id,
      created_by,
      last_updated_by
      )
      select 
        riu.male_using,
        riu.female_using,
        riu.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as results_id,
        ${config.user.id} as created_by,
        null as last_updated_by
        from results_innovations_use riu where riu.results_id = ${
          config.old_result_id
        } and riu.is_active > 0`,
      returnQuery: `select *
        from results_innovations_use riu where riu.results_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsInnovationsUseRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsUse, dataSource.createEntityManager());
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete riu from results_innovations_use riu where riu.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsUseRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsInnovationsUse> {
    const queryData = `update results_innovations_use set is_active = 0 where results_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsUseRepository.name,
          debug: true,
        }),
      );
  }

  async InnovatonUseExists(resultId: number) {
    const queryData = `
    select
      riu.result_innovation_use_id,
    	riu.male_using,
    	riu.female_using,
    	riu.is_active,
    	riu.created_date,
    	riu.last_updated_date,
    	riu.results_id,
    	riu.created_by,
    	riu.last_updated_by
    from
    	results_innovations_use riu
    WHERE
      riu.results_id = ?
    	and riu.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsInnovationsUse[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getSectionSevenDataForReport(
    resultCodesArray: number[],
    phase?: number,
  ) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const queryData = `
    select 
      -- result basic data
      r.id 'Result ID', 
      r.result_code 'Result Code',
      -- Action Area Outcome - Innovation use specific fields
      riu.female_using 'Number of females (Innovation use)',
      riu.male_using 'Number of males (Innovation use)',
      group_concat(distinct concat('Unit of measure: ', rium.unit_of_measure, '; Quantity: ', rium.quantity) separator '\n') as 'Other quantitative measures'
    from results_innovations_use riu 
    left join result r on riu.results_id = r.id and r.is_active = 1
    left join results_innovations_use_measures rium on rium.result_innovation_use_id = riu.result_innovation_use_id and rium.is_active = 1
    where 
      riu.is_active = 1
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
      ${phase ? `and r.version_id = ${phase}` : ''}
    group by 1,2,3,4
    ;
    `;
    try {
      const resultTocResult = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUse.name,
        error: error,
        debug: true,
      });
    }
  }

  async InnovUseExists(resultId: number) {
    const queryData = `
      SELECT
        riu.result_innovation_use_id,
        riu.male_using,
        riu.female_using,
        riu.results_id,
        riu.has_innovation_link,
        riu.innovation_use_level_id,
        riu.has_scaling_studies,
        riu.readiness_level_explanation,
        riu.innov_use_to_be_determined,
        riu.innov_use_2030_to_be_determined,
        ciul.level AS level,
        r.is_discontinued
      FROM result r
      JOIN results_innovations_use riu
        ON riu.results_id = r.id
      AND riu.is_active = 1
      JOIN clarisa_innovation_use_levels ciul
        ON ciul.id = riu.innovation_use_level_id
      LEFT JOIN version v
        ON v.id = r.version_id
      AND v.is_active = 1
      LEFT JOIN version previous_v
        ON previous_v.id = v.previous_phase
      AND previous_v.is_active = 1
      LEFT JOIN result previous_r
        ON previous_r.result_code = r.result_code
      AND previous_r.version_id = previous_v.id
      AND previous_r.is_active = 1
      WHERE r.id = ?
      AND r.is_active = 1;
    `;
    try {
      const InnovUseResult: ResultsInnovationsUse[] = await this.query(
        queryData,
        [resultId],
      );
      return InnovUseResult.length ? InnovUseResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getLinkedResultsByOrigin(originId: number): Promise<number[]> {
    const query = `
      SELECT linked_results_id
      FROM linked_result
      WHERE origin_result_id = ? AND is_active = TRUE;
    `;

    const results = await this.dataSource.query(query, [originId]);

    const linked_results: number[] = results.map(
      (r: any) => r.linked_results_id,
    );

    return linked_results;
  }

  /**
   * P2-3424 — write side of `getLinkedResultsByOrigin`.
   *
   * `linked_result` is shared: the P22 "Links to results" section writes rows for the very same
   * `origin_result_id`, and legacy rows carry a `legacy_link` with a NULL `linked_results_id`. So the
   * sync is deliberately narrow:
   *  - rows for the submitted ids are re-activated (or inserted when they never existed),
   *  - only rows that carry a real `linked_results_id` are de-activated, never the `legacy_link` ones.
   *
   * Callers decide WHEN to sync; this method never guesses. See `SummaryService.saveInnovationUse`.
   *
   * 🛑 DO NOT swap this for `LinkedResultsService.createForInnovationUse`
   * (`api/results/linked-results/linked-results.service.ts:191`), which the v2 route already uses.
   * The two agree on the non-empty case only. With an EMPTY selection the shared service runs
   * `update({ origin_result_id, is_active: true }, { is_active: false })` (`:244-247`) — a blanket
   * deactivation that also wipes the `legacy_link` rows (`linked_results_id IS NULL`) authored by the
   * P22 "Links to results" section. This method spares them on purpose. Reuse becomes possible only
   * once the shared empty-branch is narrowed the same way, and that change belongs to whoever owns
   * the v2 route's behaviour.
   */
  async replaceLinkedResultsByOrigin(
    originId: number,
    linkedIds: (number | string)[],
    userId: number,
  ): Promise<number[]> {
    const ids = Array.from(
      new Set(
        (linkedIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    if (!ids.length) {
      await this.dataSource.query(
        `UPDATE linked_result
           SET is_active = 0, last_updated_by = ?, last_updated_date = NOW()
         WHERE origin_result_id = ?
           AND is_active > 0
           AND linked_results_id IS NOT NULL;`,
        [userId, originId],
      );
      return this.getLinkedResultsByOrigin(originId);
    }

    const placeholders = ids.map(() => '?').join(', ');

    await this.dataSource.query(
      `UPDATE linked_result
         SET is_active = 1, last_updated_by = ?, last_updated_date = NOW()
       WHERE origin_result_id = ?
         AND linked_results_id IN (${placeholders});`,
      [userId, originId, ...ids],
    );

    const existing = await this.dataSource.query(
      `SELECT linked_results_id
         FROM linked_result
        WHERE origin_result_id = ?
          AND linked_results_id IN (${placeholders});`,
      [originId, ...ids],
    );
    const known = new Set(
      (existing ?? []).map((row: any) => Number(row?.linked_results_id)),
    );

    for (const linkedId of ids.filter((id) => !known.has(id))) {
      await this.dataSource.query(
        `INSERT INTO linked_result
           (linked_results_id, origin_result_id, is_active, created_by, last_updated_by, created_date, last_updated_date)
         VALUES (?, ?, 1, ?, ?, NOW(), NOW());`,
        [linkedId, originId, userId, userId],
      );
    }

    await this.dataSource.query(
      `UPDATE linked_result
         SET is_active = 0, last_updated_by = ?, last_updated_date = NOW()
       WHERE origin_result_id = ?
         AND is_active > 0
         AND linked_results_id IS NOT NULL
         AND linked_results_id NOT IN (${placeholders});`,
      [userId, originId, ...ids],
    );

    return this.getLinkedResultsByOrigin(originId);
  }
}
