import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInititiative } from './entities/results_by_inititiative.entity';
import { InitiativeByResultDTO } from './dto/InitiativeByResult.dto';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultByInitiativesRepository
  extends BaseRepository<ResultsByInititiative>
  implements LogicalDelete<ResultsByInititiative>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsByInititiative>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
        null as id,
        rbi.is_active,
        null as last_updated_date,
        ${config.new_result_id} as result_id,
        rbi.inititiative_id,
        rbi.initiative_role_id,
        ${config.user.id} as created_by,
        null as last_updated_by,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date
        from results_by_inititiative rbi where rbi.result_id = ${
          config.old_result_id
        } and rbi.is_active > 0
      `,
      insertQuery: `insert into results_by_inititiative (
        is_active,
        last_updated_date,
        result_id,
        inititiative_id,
        initiative_role_id,
        created_by,
        last_updated_by,
        created_date
        )
        select 
        rbi.is_active,
        null as last_updated_date,
        ${config.new_result_id} as result_id,
        rbi.inititiative_id,
        rbi.initiative_role_id,
        ${config.user.id} as created_by,
        null as last_updated_by,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date
        from results_by_inititiative rbi where rbi.result_id = ${
          config.old_result_id
        }  and rbi.is_active > 0 and rbi.initiative_role_id = 1`,
      returnQuery: `select * from results_by_inititiative rbi where rbi.result_id = ${config.new_result_id} `,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultByInitiativesRepository.name,
  );
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByInititiative, dataSource.createEntityManager());
  }

  fisicalContributorsDelete(resultId: number): Promise<any> {
    const queryData = `delete rbi from results_by_inititiative rbi where result_id = ? and initiative_role_id = 2;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByInitiativesRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  logicalContributorsDelete(resultId: number): Promise<ResultsByInititiative> {
    const queryData = `update results_by_inititiative set is_active = false where result_id = ? and initiative_role_id = 2`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByInitiativesRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rbi from results_by_inititiative rbi where result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByInitiativesRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsByInititiative> {
    const queryData = `update results_by_inititiative set is_active = false where result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByInitiativesRepository.name,
          error: err,
          debug: true,
        }),
      );
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
      rbi.inititiative_id,
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
      return completeUser?.length ? completeUser[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getPendingInit(resultId: number) {
    const queryData = `
    SELECT
    	ci.id,
    	ci.official_code,
    	ci.name as initiative_name,
    	ci.short_name,
    	null as initiative_role_id,
	    srr.request_status_id,
      srr.share_result_request_id,
    	srr.is_active
    FROM
    	share_result_request srr
    inner join clarisa_initiatives ci on
    	ci.id = srr.shared_inititiative_id
    	and srr.request_status_id = 1
    WHERE
    	srr.result_id = ?
      and srr.is_active > 0;
    `;
    try {
      const completeUser: InitiativeByResultDTO[] = await this.query(
        queryData,
        [resultId],
      );
      completeUser?.map((e) => {
        e['is_active'] = e['is_active'] == 1 ? 1 : 0;
      });
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

  async getContributorInitiativeAndPrimaryByResult(resultId: number) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      ci.short_name,
      rbi.initiative_role_id,
      rbi.is_active
    from results_by_inititiative rbi 
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
        									and ci.active > 0
    where rbi.result_id = ?
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

  async getContributorInitiativeByResultAndInit(
    resultId: number,
    initiativeId: number,
  ) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      ci.short_name,
      rbi.initiative_role_id,
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
      return getInitiative?.length ? getInitiative[0] : undefined;
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
      return completeUser?.length ? completeUser[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultsByInitiativeByResultIdAndInitiativeIdAndRole(
    resultId: number,
    initiativeId: number,
    isOwner: boolean,
  ) {
    const queryData = `
    select 
      rbi.id,
      rbi.is_active,
      rbi.last_updated_date,
      rbi.result_id,
      rbi.inititiative_id,
      rbi.initiative_role_id,
      rbi.created_by,
      rbi.last_updated_by,
      rbi.created_date
      from results_by_inititiative rbi
      where rbi.result_id = ?
      	and rbi.inititiative_id = ?
      	and rbi.initiative_role_id = ?;
    `;
    try {
      const completeUser: ResultsByInititiative[] = await this.query(
        queryData,
        [resultId, initiativeId, isOwner ? 1 : 2],
      );
      return completeUser?.length ? completeUser[0] : undefined;
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

  async updateResultByInitiative(
    resultId: number,
    initiativeArray: number[],
    userId: number,
    isOwner: boolean,
    initiativeArrayPnd: number[],
  ) {
    if (!resultId || !userId) {
      return [];
    }

    const initiativeParameter = [
      ...(initiativeArray ?? []),
      ...(initiativeArrayPnd ?? []),
    ];

    try {
      const inits = `
        SELECT inititiative_id 
        FROM results_by_inititiative 
        WHERE result_id = ? 
          AND initiative_role_id = 2 
          AND is_active > 0
      `;

      const initsResult = await this.query(inits, [resultId]);
      const currentInits = initsResult.map((e) => e.inititiative_id);
      const initsToInactive = currentInits.filter(
        (e) => !initiativeParameter.includes(e),
      );

      if (!initsToInactive.length) {
        return [];
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (initsToInactive.length) {
          await queryRunner.query(
            `
            UPDATE results_toc_result
            SET last_updated_date = NOW(),
                last_updated_by = ?,
                is_active = 0,
                planned_result = NULL
            WHERE results_id = ?
              AND initiative_id IN (?)
              AND is_active > 0
          `,
            [userId, resultId, initsToInactive],
          );

          await queryRunner.query(
            `
            UPDATE results_by_inititiative
            SET is_active = 0,
                last_updated_date = NOW(),
                last_updated_by = ?
            WHERE result_id = ?
              AND initiative_role_id = 2
              AND inititiative_id IN (?)
              AND is_active > 0
          `,
            [userId, resultId, initsToInactive],
          );
        }

        await queryRunner.commitTransaction();
        return initsToInactive;
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async updateIniciativeSubmitter(
    resultId: number,
    old_primary_submitter: number,
    new_primary_submitter: number,
  ) {
    try {
      let updateIniciative: any;
      if (resultId != null) {
        await this.update(
          {
            result_id: resultId,
            is_active: true,
            initiative_id: old_primary_submitter,
          },
          {
            initiative_role_id: 2,
          },
        );

        updateIniciative = await this.update(
          { result_id: resultId, initiative_id: new_primary_submitter },
          {
            initiative_role_id: 1,
            is_active: true,
          },
        );
      }

      await this.findOneBy({
        result_id: resultId,
        initiative_id: new_primary_submitter,
      });

      return {
        initiative_id: new_primary_submitter,
        old_initiative: old_primary_submitter,
        response: updateIniciative,
      };
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: `updateResultByInitiativeSubmitter ${error}`,
        debug: true,
      });
    }
  }
}
