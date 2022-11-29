import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInititiative } from './entities/results_by_inititiative.entity';
import { InitiativeByResultDTO } from './dto/InitiativeByResult.dto';

@Injectable()
export class ResultByInitiativesRepository extends Repository<ResultsByInititiative> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByInititiative, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM results_by_inititiative;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async InitiativeByResult(resultId: number) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      rbi.initiative_role_id,
      rbi.version_id,
      rbi.is_active 
    from results_by_inititiative rbi 
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
        									and ci.active > 0
    where rbi.result_id = ?
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: InitiativeByResultDTO[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getOwnerInitiativeByResult(resultId: number) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      ci.short_name,
      rbi.initiative_role_id,
      rbi.version_id,
      rbi.is_active
    from results_by_inititiative rbi 
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
        									and ci.active > 0
    where rbi.result_id = ?
      and rbi.initiative_role_id = 1
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: InitiativeByResultDTO[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser?.length?completeUser[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getPendingInit (resultId: number) {
    const queryData = `
    SELECT
    	ci.id,
    	ci.official_code,
    	ci.name as initiative_name,
    	ci.short_name,
    	null as initiative_role_id,
    	null as version_id,  
	    srr.request_status_id,
    	1 as is_active
    FROM
    	share_result_request srr
    inner join clarisa_initiatives ci on
    	ci.id = srr.shared_inititiative_id
    	and srr.request_status_id = 1
    WHERE
    	srr.result_id = ?;
    `;
    try {
      const completeUser: InitiativeByResultDTO[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getContributorInitiativeByResult(resultId: number) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      ci.short_name,
      rbi.initiative_role_id,
      rbi.version_id,
      rbi.is_active
    from results_by_inititiative rbi 
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
        									and ci.active > 0
    where rbi.result_id = ?
      and rbi.initiative_role_id = 2
      and rbi.is_active > 0;
    `;
    try {
      const getInitiative: InitiativeByResultDTO[] = await this.query(
        queryData,
        [resultId],
      );
      return getInitiative;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getContributorInitiativeByResultAndInit(resultId: number, initiativeId: number) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      ci.short_name,
      rbi.initiative_role_id,
      rbi.version_id,
      rbi.is_active
    from results_by_inititiative rbi 
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
        									and ci.active > 0
    where rbi.result_id = ?
      and ci.id = ?
      and rbi.initiative_role_id = 2
      and rbi.is_active > 0;
    `;
    try {
      const getInitiative: InitiativeByResultDTO[] = await this.query(
        queryData,
        [resultId, initiativeId],
      );
      return getInitiative?.length? getInitiative[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInitiativeFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.inititiative_id,
    	rbi.initiative_role_id,
    	rbi.is_active,
    	rbi.version_id,
    	rbi.created_by,
    	rbi.created_date,
    	rbi.last_updated_by,
    	rbi.last_updated_date 
    from results_by_inititiative rbi 
    where rbi.result_id = ?
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInititiative[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInitiativeOwnerFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.inititiative_id,
    	rbi.initiative_role_id,
    	rbi.is_active,
    	rbi.version_id,
    	rbi.created_by,
    	rbi.created_date,
    	rbi.last_updated_by,
    	rbi.last_updated_date 
    from results_by_inititiative rbi 
    where rbi.result_id = ?
      and rbi.initiative_role_id = 1
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInititiative[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser?.length?completeUser[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultsByInitiativeByResultIdAndInitiativeIdAndRole(resultId: number, initiativeId: number, isOwner: boolean) {
    const queryData = `
    select 
      rbi.id,
      rbi.is_active,
      rbi.last_updated_date,
      rbi.result_id,
      rbi.inititiative_id,
      rbi.initiative_role_id,
      rbi.version_id,
      rbi.created_by,
      rbi.last_updated_by,
      rbi.created_date
      from results_by_inititiative rbi
      where rbi.is_active > 0
      	and rbi.result_id = ?
      	and rbi.inititiative_id = ?
      	and rbi.initiative_role_id = ?;
    `;
    try {
      const completeUser: ResultsByInititiative[] = await this.query(
        queryData,
        [resultId, initiativeId, isOwner?1:2],
      );
      return completeUser?.length?completeUser[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async logicalElimination(resultId: number) {
    const queryData = `
    update results_by_inititiative
    set is_active = false
    where result_id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateResultByInitiative(resultId: number, initiativeArray: number[], userId: number, isOwner: boolean) {
    const initiative = initiativeArray??[];
    const upDateInactive = `
        update results_by_inititiative  
        set is_active  = 0,
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and result_id = ?
          and initiative_role_id = ?
          and inititiative_id not in (${initiative.toString()});
    `;

    const upDateActive = `
      update results_by_inititiative  
      set is_active  = 1,
        last_updated_date = NOW(),
        last_updated_by = ?
      where result_id = ?
        and initiative_role_id = ?
        and inititiative_id in (${initiative.toString()});
    `;

    const upDateAllInactive = `


    update results_by_inititiative  
      set is_active  = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and result_id = ?
        and initiative_role_id = ?;
    `;

    try {
      if(initiative?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId, isOwner?1:2
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId, isOwner?1:2
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId, isOwner?1:2
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }
}


