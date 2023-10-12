import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInstitutionType } from './entities/results_by_institution_type.entity';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultByIntitutionsTypeRepository
  extends Repository<ResultsByInstitutionType>
  implements
    ReplicableInterface<ResultsByInstitutionType>,
    LogicalDelete<ResultsByInstitutionType>
{
  private readonly _logger: Logger = new Logger(
    ResultByIntitutionsTypeRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByInstitutionType, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultsByInstitutionType> {
    const queryData = `update results_by_institution_type set is_active = false where results_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByIntitutionsTypeRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsByInstitutionType>,
  ): Promise<ResultsByInstitutionType[]> {
    let final_data: ResultsByInstitutionType[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
          null as id,
          rbit.is_active,
          now() as creation_date,
          null as last_updated_date,
          ? as results_id,
          rbit.institution_roles_id,
          ? as created_by,
          null as last_updated_by,
          rbit.institution_types_id,
          rbit.how_many,
          rbit.other_institution,
          rbit.graduate_students
          from results_by_institution_type rbit WHERE  rbit.results_id = ? and rbit.is_active > 0
        `;
        const response = await (<Promise<ResultsByInstitutionType[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsByInstitutionType[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into results_by_institution_type 
          (
          is_active,
          creation_date,
          last_updated_date,
          results_id,
          institution_roles_id,
          created_by,
          last_updated_by,
          institution_types_id,
          how_many,
          other_institution,
          graduate_students
          )
          select
          rbit.is_active,
          now() as creation_date,
          null as last_updated_date,
          ? as results_id,
          rbit.institution_roles_id,
          ? as created_by,
          null as last_updated_by,
          rbit.institution_types_id,
          rbit.how_many,
          rbit.other_institution,
          rbit.graduate_students
          from results_by_institution_type rbit WHERE  rbit.results_id = ? and rbit.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select 
          rbit.id,
          rbit.is_active,
          rbit.creation_date,
          rbit.last_updated_date,
          rbit.results_id,
          rbit.institution_roles_id,
          rbit.created_by,
          rbit.last_updated_by,
          rbit.institution_types_id,
          rbit.how_many,
          rbit.other_institution,
          rbit.graduate_students
          from results_by_institution_type rbit WHERE  rbit.results_id = ?`;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction
      ? config.f.completeFunction({ ...final_data })
      : null;

    return final_data;
  }

  async getResultByInstitutionTypeFull(resultId: number) {
    const queryData = `
    select 
    	rbit.id,
    	rbit .institution_types_id,
    	rbit.institution_roles_id
    from results_by_institution_type rbit
    where rbit.results_id  = ?
    	and rbit.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitutionType[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionTypeActorFull(resultId: number) {
    const queryData = `
    select 
    	rbit.id,
    	rbit.institution_types_id as institutions_type_id,
    	rbit.institution_roles_id as institutions_roles_id,
    	cit.name as institutions_type_name
    from results_by_institution_type rbit
    inner join clarisa_institution_types cit ON cit.code = rbit.institution_types_id 
    where rbit.results_id  = ?
      and rbit.institution_roles_id = 1
    	and rbit.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitutionType[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionTypePartnersFull(resultId: number) {
    const queryData = `
    select 
    	rbit.id,
    	rbit .institution_types_id,
    	rbit.institution_roles_id
    from results_by_institution_type rbit
    where rbit.results_id  = ?
      and rbit.institution_roles_id = 2
    	and rbit.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitutionType[] = await this.query(
        queryData,
        [resultId],
      );
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionTypeExists(
    resultId: number,
    institutionsTypeId: number,
    isActor: boolean,
  ) {
    const queryData = `
    select 
    	rbit.id,
    	rbit .institution_types_id,
    	rbit.is_active,
    	rbit.creation_date,
    	rbit.last_updated_date,
    	rbit.results_id,
    	rbit.institution_roles_id,
    	rbit.created_by,
    	rbit.last_updated_by,
      rbit.how_many 
    from results_by_institution_type rbit
    where rbit.results_id  = ?
      and institution_roles_id = ?
      and rbit.institution_types_id = ?;
    `;
    try {
      const completeUser: ResultsByInstitutionType[] = await this.query(
        queryData,
        [resultId, isActor ? 1 : 2, institutionsTypeId],
      );
      return completeUser?.length ? completeUser[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getNewResultByInstitutionTypeExists(
    resultId: number,
    institutionsTypeId: number,
    type: number,
  ) {
    const queryData = `
    select 
    	rbit.id,
    	rbit .institution_types_id,
    	rbit.is_active,
    	rbit.creation_date,
    	rbit.last_updated_date,
    	rbit.results_id,
    	rbit.institution_roles_id,
    	rbit.created_by,
    	rbit.last_updated_by,
      rbit.how_many,
      rbit.other_institution 
    from results_by_institution_type rbit
    where rbit.results_id  = ?
      and institution_roles_id = ?
      and rbit.institution_types_id = ?;
    `;
    try {
      const completeUser: ResultsByInstitutionType[] = await this.query(
        queryData,
        [resultId, type, institutionsTypeId],
      );
      return completeUser?.length ? completeUser[0] : null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getNewResultByIdExists(resultId: number, id: number, type: number) {
    const queryData = `
    select 
    	rbit.id,
    	rbit .institution_types_id,
    	rbit.is_active,
    	rbit.creation_date,
    	rbit.last_updated_date,
    	rbit.results_id,
    	rbit.institution_roles_id,
    	rbit.created_by,
    	rbit.last_updated_by,
      rbit.how_many,
      rbit.other_institution
    from results_by_institution_type rbit
    where rbit.results_id  = ?
      and rbit.institution_roles_id = ?
      and rbit.id = ?;
    `;
    try {
      const completeUser: ResultsByInstitutionType[] = await this.query(
        queryData,
        [resultId, type, id],
      );
      return completeUser?.length ? completeUser[0] : null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async logicalElimination(resultId: number) {
    const queryData = `
    update results_by_institution_type 
    set is_active = false
    where results_id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateIstitutionsType(
    resultId: number,
    institutionsArray: institutionsTypeInterface[],
    isActor: boolean,
    userId: number,
  ) {
    const institutions = institutionsArray.map((el) => el.institutions_type_id);
    const upDateInactive = `
    update results_by_institution_type  
    set is_active = 0, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
    where is_active > 0 
    	and results_id = ?
      and institution_roles_id = ?
    	and institution_types_id not in (${institutions.toString()});
    `;

    const upDateActive = `
    update results_by_institution_type  
    set is_active = 1, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
    where results_id = ?
      and institution_roles_id = ?
    	and institution_types_id in (${institutions.toString()});
    `;

    const upDateAllInactive = `
    update results_by_institution_type  
    set is_active = 0, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
    where is_active > 0
      and results_id = ?
      and institution_roles_id = ?;
    `;
    try {
      if (institutions.length) {
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId,
          resultId,
          isActor ? 1 : 2,
        ]);

        return await this.query(upDateActive, [
          userId,
          resultId,
          isActor ? 1 : 2,
        ]);
      } else {
        return await this.query(upDateAllInactive, [
          userId,
          resultId,
          isActor ? 1 : 2,
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}

interface institutionsTypeInterface {
  institutions_type_id: number;
}
