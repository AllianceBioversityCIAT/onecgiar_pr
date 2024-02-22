import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { institutionsInterface } from './dto/save_results_by_institution.dto';
import { InstitutionRoleEnum } from './entities/institution_role.enum';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultByIntitutionsRepository
  extends BaseRepository<ResultsByInstitution>
  implements LogicalDelete<ResultsByInstitution>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsByInstitution>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT 
        null as id,
        rbi.institutions_id,
        rbi.institution_roles_id,
        rbi.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        ${config.new_result_id} as result_id
        from results_by_institution rbi WHERE rbi.result_id = ${
          config.old_result_id
        } and rbi.is_active > 0
      `,
      insertQuery: `
      insert into results_by_institution (
        institutions_id,
        institution_roles_id,
        is_active,
        created_date,
        last_updated_date,
        created_by,
        last_updated_by,
        result_id
        )SELECT 
        rbi.institutions_id,
        rbi.institution_roles_id,
        rbi.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        ${config.new_result_id} as result_id
        from results_by_institution rbi WHERE rbi.result_id = ${
          config.old_result_id
        } and rbi.is_active > 0`,
      returnQuery: `
        SELECT rbi.* from results_by_institution rbi WHERE rbi.result_id = ${config.new_result_id}
        `,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultByIntitutionsRepository.name,
  );
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByInstitution, dataSource.createEntityManager());
  }

  changePartnersType(
    result_id: number,
    current_partners_type: InstitutionRoleEnum[],
    new_partner_type: InstitutionRoleEnum,
  ) {
    const queryData = `update results_by_institution rbi 
    SET rbi.institution_roles_id = ?
    where rbi.result_id = ? and rbi.institution_roles_id in (?);`;
    return this.query(queryData, [
      new_partner_type,
      result_id,
      current_partners_type,
    ])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByIntitutionsRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  fisicalDeleteByTypeAndResultId(
    resultId: number,
    institution_type: InstitutionRoleEnum[],
  ) {
    const queryData = `delete rbi from results_by_institution rbi where rbi.result_id = ? and rbi.institution_roles_id in (?);`;
    return this.query(queryData, [resultId, institution_type])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByIntitutionsRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rbi from results_by_institution rbi where rbi.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByIntitutionsRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsByInstitution> {
    const queryData = `update results_by_institution set is_active = false where result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultByIntitutionsRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  async getResultByInstitutionById(resultId: number, rbiId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.institutions_id,
    	rbi.institution_roles_id
    from results_by_institution rbi 
    where rbi.result_id = ?
      and rbi.id = ?
    	and rbi.is_active > 0;
    `;
    try {
      const completeIntitutions: ResultsByInstitution[] = await this.query(
        queryData,
        [resultId, rbiId],
      );
      return completeIntitutions;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.institutions_id,
    	rbi.institution_roles_id
    from results_by_institution rbi 
    where rbi.result_id = ?
    	and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionActorsFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.institutions_id,
    	ci.name institutions_name,
    	ci.acronym as institutions_acronym,
    	rbi.institution_roles_id,
    	cit.code as institutions_type_id, 
    	cit.name as institutions_type_name
    from results_by_institution rbi 
    inner join clarisa_institutions ci on ci.id  = rbi.institutions_id 
              and ci.is_active > 0
    inner join clarisa_institution_types cit on cit.code = ci.institution_type_code 
    where rbi.result_id = ?
      and rbi.institution_roles_id = 1
    	and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionPartnersFull(
    resultId: number,
    institutionRoles: InstitutionRoleEnum[] = [InstitutionRoleEnum.PARTNER],
  ) {
    const queryData = `
    select 
    rbi.id,
    rbi.institutions_id,
    ci.name institutions_name,
    ci.acronym as institutions_acronym,
    rbi.institution_roles_id,
    cit.code as institutions_type_id, 
    cit.name as institutions_type_name
    from results_by_institution rbi 
    inner join clarisa_institutions ci on ci.id  = rbi.institutions_id 
    and ci.is_active > 0
    inner join clarisa_institution_types cit on cit.code = ci.institution_type_code
    where rbi.result_id = ?
    and rbi.institution_roles_id in (${institutionRoles.join()})
    and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async logicalElimination(resultId: number) {
    const queryData = `
    update results_by_institution 
    set is_active = false
    where result_id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionExists(
    resultId: number,
    institutionsId: number,
    institutionRole: InstitutionRoleEnum = InstitutionRoleEnum.PARTNER,
  ): Promise<ResultsByInstitution> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.created_by,
    	rbi.last_updated_date,
    	rbi.last_updated_by 
    from results_by_institution rbi 
    where rbi.result_id = ?
      and institution_roles_id = ?
      and rbi.institutions_id = ?;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
        institutionRole,
        institutionsId,
      ]);
      return completeUser?.length ? completeUser[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getGenericResultByInstitutionExists(
    resultId: number,
    institutionsId: number,
    institutionRolesId: 1 | 2 | 3 | 4 | 5,
  ): Promise<ResultsByInstitution> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.created_by,
    	rbi.last_updated_date,
    	rbi.last_updated_by 
    from results_by_institution rbi 
    where rbi.result_id = ?
      and institution_roles_id = ?
      and rbi.institutions_id = ?;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
        institutionRolesId,
        institutionsId,
      ]);
      return completeUser?.length ? completeUser[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getGenericAllResultByInstitutionByRole(
    resultId: number,
    institutionRolesId: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  ): Promise<ResultsByInstitution[]> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.created_by,
    	rbi.last_updated_date,
    	rbi.last_updated_by,
      ci.name as institutions_name,
		  ci.acronym as institutions_acronym,
      cit.name as institutions_type_name
    from results_by_institution rbi 
    inner join clarisa_institutions ci on ci.id  = rbi.institutions_id 
    inner join clarisa_institution_types cit on cit.code = ci.institution_type_code
    and ci.is_active > 0
    where rbi.result_id = ?
      and rbi.institution_roles_id = ?
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
        institutionRolesId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateIstitutions(
    resultId: number,
    institutionsArray: institutionsInterface[],
    userId: number,
    notApplicablePartner = false,
    institutionRole: InstitutionRoleEnum[] = [InstitutionRoleEnum.PARTNER],
  ) {
    const institutions = notApplicablePartner
      ? institutionsArray.filter(
          (el) =>
            el.institution_roles_id !=
            InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
        )
      : institutionsArray;
    const institutionIds = institutions.map((el) => el.institutions_id);

    // deactivates all rbis from a given resultId, and with some given roles, that are NOT in the incoming list
    const upDateInactiveRBI = `
    update results_by_institution 
    set is_active = 0, 
    last_updated_date = NOW(), 
    last_updated_by = ? 
    where is_active > 0 
    	and result_id = ?
      and institution_roles_id in (?)
    	${
        institutionIds?.length
          ? `and institutions_id not in (${
              institutionIds?.toString() || 'null'
            })`
          : ''
      };
    `;

    // activates all rbis from a given resultId, and with some given roles, that are in the incoming list
    const upDateActiveRBI = `
    update results_by_institution 
    set is_active = 1, 
      last_updated_date = NOW(), 
      last_updated_by = ? 
      where result_id = ?
      and institution_roles_id in (?)
      ${
        institutionIds?.length
          ? `and institutions_id in (${institutionIds?.toString() || 'null'})`
          : ''
      };
      `;

    //removes the link between a kpmqap institution and a manually mapped institution,
    //from a given result and that is not present on the incoming institution list (KP-specific query)
    const removeRelationRKPMI = `
      update results_kp_mqap_institutions rkpmi
      inner join results_knowledge_product rkp on rkpmi.result_knowledge_product_id = rkp.result_knowledge_product_id
    left join results_by_institution rbi on rkpmi.results_by_institutions_id = rbi.id
    set rkpmi.results_by_institutions_id = NULL,
    rkpmi.last_updated_date = NOW(), 
    rkpmi.last_updated_by = ? 
    where rkpmi.is_active > 0 
    and rkp.results_id = ?
    	${
        institutionIds?.length
          ? `and rbi.institutions_id not in (${
              institutionIds?.toString() || 'null'
            })`
          : ''
      };
          `; //TODO validate query

    //deactivates all rbis from a given resultId, and with some given roles
    /*const upDateAllInactiveRBI = `
          update results_by_institution 
      set is_active = 0, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
      where is_active > 0 
      and result_id = ?
      and institution_roles_id = (?);
      `;
      
      
      const removeAllRelationRKPMI = `
      update results_kp_mqap_institutions rkpmi
      inner join results_knowledge_product rkp on rkpmi.result_knowledge_product_id = rkp.result_knowledge_product_id
      set rkpmi.results_by_institutions_id = NULL,
        rkpmi.last_updated_date = NOW(), 
        rkpmi.last_updated_by = ? 
      where rkpmi.is_active > 0 
        and rkp.results_id = ?
        `; //TODO validate query
        */

    try {
      //here we are counting the number of institutions with the role = 8 are there
      //unique role for kp institutions, so if there is any, the result is a kp
      let executionResult = null;
      const isKP: boolean =
        (await this.$_getResultTypeFromResultId(resultId)) == 6;

      await this.query(upDateInactiveRBI, [userId, resultId, institutionRole]);

      if (isKP) {
        executionResult = await this.query(removeRelationRKPMI, [
          userId,
          resultId,
        ]);
      }

      if (institutionIds?.length && !(notApplicablePartner && !isKP)) {
        executionResult = await this.query(upDateActiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]);
      }

      return executionResult;

      /*if (probableKP) {
        const upDateInactiveResult = await this.query(upDateInactiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]).then((res) => {
          this.query(removeRelationRKPMI, [userId, resultId]);
        });

        return await this.query(upDateActiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]);
      } else {
        await this.query(removeAllRelationRKPMI, [userId, resultId]);
        return await this.query(upDateAllInactiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]);
      }*/
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: `updateIstitutions ${error}`,
        debug: true,
      });
    }
  }

  private async $_getResultTypeFromResultId(resultId: number): Promise<number> {
    try {
      const query = `
      select r.result_type_id
      from result r
      where r.id = ?
      `;
      const algo = await (<Promise<{ result_type_id: number }[]>>(
        this.query(query, [resultId])
      ));
      return algo?.length ? algo[0].result_type_id : null;
    } catch (error) {
      return null;
    }
  }

  async updateGenericIstitutions(
    resultId: number,
    institutionsArray: institutionsInterface[],
    institutionRole: 1 | 2 | 3 | 4 | 5,
    userId: number,
    applicablePartner = false,
  ) {
    const institutions = !applicablePartner
      ? institutionsArray.map((el) => el.institutions_id)
      : [];
    const upDateInactiveRBI = `
    update results_by_institution 
    set is_active = 0, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
    where is_active > 0 
    	and result_id = ?
      and institution_roles_id = ?
    	and institutions_id not in (${institutions.toString()});
    `;
    const removeRelationRKPMI = `
    update results_kp_mqap_institutions rkpmi
    inner join results_knowledge_product rkp on rkpmi.result_knowledge_product_id = rkp.result_knowledge_product_id
    set rkpmi.results_by_institutions_id = NULL,
      rkpmi.last_updated_date = NOW(), 
    	rkpmi.last_updated_by = ? 
    where rkpmi.is_active > 0 
      and rkp.results_id = ?
    	and rkpmi.results_by_institutions_id not in (${institutions.toString()});
    `; //TODO validate query

    const upDateActiveRBI = `
    update results_by_institution 
    set is_active = 1, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
      where result_id = ?
      and institution_roles_id = ?
    	and institutions_id in (${institutions.toString()});
      `;

    const upDateAllInactiveRBI = `
      update results_by_institution 
      set is_active = 0, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
      where is_active > 0 
      and result_id = ?
      and institution_roles_id = ?;
      `;

    const removeAllRelationRKPMI = `
      update results_kp_mqap_institutions rkpmi
      inner join results_knowledge_product rkp on rkpmi.result_knowledge_product_id = rkp.result_knowledge_product_id
      set rkpmi.results_by_institutions_id = NULL,
        rkpmi.last_updated_date = NOW(), 
        rkpmi.last_updated_by = ? 
      where rkpmi.is_active > 0 
        and rkp.results_id = ?
      `; //TODO validate query

    try {
      if (institutions?.length) {
        await this.query(upDateInactiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]).then((_res) => {
          this.query(removeRelationRKPMI, [userId, resultId]);
        });

        return await this.query(upDateActiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]);
      } else {
        this.query(removeAllRelationRKPMI, [userId, resultId]);
        return await this.query(upDateAllInactiveRBI, [
          userId,
          resultId,
          institutionRole,
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: `updateIstitutions ${error}`,
        debug: true,
      });
    }
  }
}

/*interface institutionsInterface {
  institutions_id: number;
}*/
