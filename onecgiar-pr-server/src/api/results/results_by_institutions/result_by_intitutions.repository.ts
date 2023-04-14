import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultByIntitutionsRepository extends Repository<ResultsByInstitution> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByInstitution, dataSource.createEntityManager());
  }

  async getResultByInstitutionById(resultId: number, rbiId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.version_id
    from results_by_institution rbi 
    where rbi.result_id = ?
      and rbi.id = ?
    	and rbi.is_active > 0;
    `;
    try {
      const completeIntitutions: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
        rbiId
      ]);
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
    	rbi.institution_roles_id,
    	rbi.version_id
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
    	rbi.version_id,
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

  async getResultByInstitutionPartnersFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.institutions_id,
    	ci.name institutions_name,
    	ci.acronym as institutions_acronym,
    	rbi.institution_roles_id,
    	rbi.version_id,
    	cit.code as institutions_type_id, 
    	cit.name as institutions_type_name
    from results_by_institution rbi 
    inner join clarisa_institutions ci on ci.id  = rbi.institutions_id 
    and ci.is_active > 0
    inner join clarisa_institution_types cit on cit.code = ci.institution_type_code 
    where rbi.result_id = ?
      and rbi.institution_roles_id = 2
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
    isActor: boolean,
  ): Promise<ResultsByInstitution> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.version_id,
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
        isActor ? 1 : 2,
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
    institutionRolesId: 1 | 2 | 3| 4| 5,
  ): Promise<ResultsByInstitution> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.version_id,
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
    institutionRolesId: 1 | 2 | 3| 4| 5,
  ): Promise<ResultsByInstitution[]> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.version_id,
    	rbi.created_by,
    	rbi.last_updated_date,
    	rbi.last_updated_by,
      ci.name as institutions_name,
		  ci.acronym as institutions_acronym
    from results_by_institution rbi 
    inner join clarisa_institutions ci on ci.id  = rbi.institutions_id 
    and ci.is_active > 0
    where rbi.result_id = ?
      and rbi.institution_roles_id = ?
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
        institutionRolesId
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
    isActor: boolean,
    userId: number,
    applicablePartner: boolean = false,
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
        const upDateInactiveResult = await this.query(upDateInactiveRBI, [
          userId,
          resultId,
          isActor ? 1 : 2,
        ]).then((res) => {
          this.query(removeRelationRKPMI, [userId, resultId]);
        });

        return await this.query(upDateActiveRBI, [
          userId,
          resultId,
          isActor ? 1 : 2,
        ]);
      } else {
        this.query(removeAllRelationRKPMI, [userId, resultId]);
        return await this.query(upDateAllInactiveRBI, [
          userId,
          resultId,
          isActor ? 1 : 2,
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

  async updateGenericIstitutions(
    resultId: number,
    institutionsArray: institutionsInterface[],
    institutionRole: 1|2|3|4 |5,
    userId: number,
    applicablePartner: boolean = false,
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

interface institutionsInterface {
  institutions_id: number;
}

