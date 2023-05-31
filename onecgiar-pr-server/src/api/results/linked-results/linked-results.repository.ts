import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { LinkedResult } from './entities/linked-result.entity';

@Injectable()
export class LinkedResultRepository extends Repository<LinkedResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(LinkedResult, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM linked_result;
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
    r.version_id,
    r.result_type_id,
    r.status,
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
    lr.legacy_link 
  from linked_result lr 
  	left join \`result\` r on r.id  = lr.linked_results_id 
    left join result_level rl on rl.id = r.result_level_id 
    left join result_type rt on rt.id = r.result_type_id  
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
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId,
          resultId,
        ]);

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
