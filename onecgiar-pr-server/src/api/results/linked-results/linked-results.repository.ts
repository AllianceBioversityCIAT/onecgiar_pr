import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { LinkedResult } from './entities/linked-result.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import {
  VERSIONING,
  predeterminedDateValidation,
} from '../../../shared/utils/versioning.utils';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class LinkedResultRepository
  extends BaseRepository<LinkedResult>
  implements LogicalDelete<LinkedResult>
{
  createQueries(
    config: ReplicableConfigInterface<LinkedResult>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `select
      lr.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${VERSIONING.QUERY.Get_link_result_qa(
        `lr.linked_results_id`,
      )} as linked_results_id,
      ${config.new_result_id} as origin_result_id,
      ${config.user.id} as created_by,
      ${config.user.id} as last_updated_by,
      lr.legacy_link
      from linked_result lr WHERE lr.origin_result_id = ${
        config.old_result_id
      } and is_active > 0`,
      insertQuery: `
      insert into linked_result (
        is_active,
        created_date,
        last_updated_date,
        linked_results_id,
        origin_result_id,
        created_by,
        last_updated_by,
        legacy_link
        )
        select
        lr.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${VERSIONING.QUERY.Get_link_result_qa(
          `lr.linked_results_id`,
        )} as linked_results_id,
        ${config.new_result_id} as origin_result_id,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        lr.legacy_link
        from linked_result lr WHERE lr.origin_result_id = ${
          config.old_result_id
        } and is_active > 0`,
      returnQuery: `
      select lr.*
      from linked_result lr WHERE lr.origin_result_id = ${config.new_result_id} and is_active > 0`,
    };
  }
  private readonly _logger: Logger = new Logger(LinkedResultRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(LinkedResult, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete lr from linked_result lr where lr.origin_result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: LinkedResultRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<LinkedResult> {
    const dataQuery = `update linked_result lr set lr.is_active = 0 where lr.origin_result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: LinkedResultRepository.name,
          debug: true,
        }),
      );
  }

  async deleteAllData() {
    const queryData = `
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LinkedResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getLinkResultByIdResultAndLinkId(resultId: number, link: number) {
    const query = `
    select 
    lr.id,
    lr.is_active,
    lr.created_date,
    lr.last_updated_date,
    lr.linked_results_id,
    lr.origin_result_id,
    lr.created_by,
    lr.last_updated_by,
    lr.legacy_link
    from linked_result lr 
    where lr.origin_result_id = ?
    	and lr.linked_results_id = ?;
    `;

    try {
      const linked: LinkedResult[] = await this.query(query, [resultId, link]);
      return linked?.length ? linked[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LinkedResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getLinkResultByIdResultAndLegacyLinkId(resultId: number, link: string) {
    const query = `
    select 
    lr.id,
    lr.is_active,
    lr.created_date,
    lr.last_updated_date,
    lr.linked_results_id,
    lr.origin_result_id,
    lr.created_by,
    lr.last_updated_by,
    lr.legacy_link
    from linked_result lr 
    where lr.origin_result_id = ?
    	and lr.legacy_link = ?;
    `;

    try {
      const linked: LinkedResult[] = await this.query(query, [resultId, link]);
      return linked?.length ? linked[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LinkedResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getMostUpDateResult(result_code: number) {
    const query = `
    select * from (SELECT 
      r2.id,
      if(r2.version_id  = (select max(r3.version_id) 
            from \`result\` r3 
            where r3.result_code = r2.result_code and r3.is_active > 0),1,0) +
      if(r2.status_id = 2,2,0) as max_data
    FROM \`result\` r2 
    WHERE r2.result_code = ? and r2.is_active > 0) f;
    `;
    try {
      const result: { id: number; max_data: number }[] = await this.query(
        query,
        [result_code],
      );
      const largestObject = result.reduce((acc, obj) => {
        if (obj.max_data > acc.max_data) {
          return obj;
        } else {
          return acc;
        }
      });
      return largestObject?.id ? largestObject.id : null;
    } catch (error) {
      return null;
    }
  }

  async getLinkResultByIdResult(resultId: number) {
    const query = `
    select 
    lr.id as link_result_id,
    lr.is_active,
    lr.created_date,
    lr.last_updated_date,
    lr.linked_results_id as id,
    lr.origin_result_id,
    lr.created_by,
    lr.last_updated_by,
    r.description,
    r.is_active,
    r.last_updated_date,
    r.gender_tag_level_id,
    r.result_type_id,
    r.status,
    r.status_id,
    rs.status_name,
    r.created_by,
    r.last_updated_by,
    r.reported_year_id,
    r.created_date,
    r.result_level_id,
    r.title,
    r.legacy_id,
    r.no_applicable_partner,
    r.geographic_scope_id,
    rl.name as result_level,
    rt.name as result_type,
    r.has_regions,
    r.has_countries,
    lr.legacy_link,
    v.id as version_id,
    v.phase_name,
    rs.status_name,
    r.result_code
  from linked_result lr 
  	left join \`result\` r on r.id  = lr.linked_results_id 
    left join result_level rl on rl.id = r.result_level_id 
    left join result_type rt on rt.id = r.result_type_id 
    left JOIN result_status rs ON rs.result_status_id = r.status_id  
    left join \`version\` v on v.id = r.version_id 
    where lr.origin_result_id = ?
          and lr.is_active > 0;
    `;

    try {
      const linked: LinkedResult[] = await this.query(query, [resultId]);
      return linked;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LinkedResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateLink(
    resultId: number,
    resultsArray: number[],
    legacyLinkArray: string[],
    userId: number,
    isLegacy: boolean,
  ) {
    const results = resultsArray ?? [];
    const legacy = legacyLinkArray ?? [];
    const upDateInactive = `
    update linked_result  
      set is_active = 0, 
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and origin_result_id = ?
        ${
          resultsArray?.reduce((acum, val) => acum + val, 0) > 0 && !isLegacy
            ? `and linked_results_id not in (${
                !results.length ? `''` : results.toString()
              })`
            : `and legacy_link not in (${`'${legacy
                .toString()
                .replace(/,/g, "','")}'`})`
        }
        ;
    `;

    const upDateActive = `
    update linked_result  
      set is_active = 1, 
        last_updated_date = NOW(),
        last_updated_by = ?
      where origin_result_id = ?
      ${
        resultsArray?.reduce((acum, val) => acum + val, 0) > 0 && !isLegacy
          ? `and linked_results_id in (${
              !results.length ? `''` : results.toString()
            })`
          : `and legacy_link in (${`'${legacy
              .toString()
              .replace(/,/g, "','")}'`})`
      }
        ;
    `;

    const upDateAllInactive = `
    update linked_result  
      set is_active = 0, 
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
      and origin_result_id = ?;
    `;

    try {
      if (results?.length || legacy?.length) {
        await this.query(upDateInactive, [userId, resultId]);

        return await this.query(upDateActive, [userId, resultId]);
      } else {
        return await this.query(upDateAllInactive, [userId, resultId]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: LinkedResultRepository.name,
        error: `updateLinks ${error}`,
        debug: true,
      });
    }
  }
}
