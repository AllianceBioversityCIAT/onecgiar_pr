import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Evidence } from './entities/evidence.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import {
  VERSIONING,
  predeterminedDateValidation,
} from '../../../shared/utils/versioning.utils';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { EvidenceWithEvidenceSharepoint } from './interfaces/evidence-with-evidence-sharepoint.interface';
import { EvidenceTypeEnum } from '../../../shared/constants/evidence-type.enum';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class EvidencesRepository
  extends BaseRepository<Evidence>
  implements LogicalDelete<Evidence>
{
  createQueries(
    config: ReplicableConfigInterface<Evidence>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select
        null as id,
        e.description,
        e.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as creation_date,
        e.last_updated_date,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        e.gender_related,
        e.link,
        e.youth_related,
        e.nutrition_related,
        e.environmental_biodiversity_related,
        e.poverty_related,
        e.is_supplementary,
        e.is_sharepoint,
        ${config.new_result_id} as result_id,
        ${VERSIONING.QUERY.Get_result_phases(
          `e.knowledge_product_related`,
          config.phase,
        )} as knowledge_product_related,
        e.evidence_type_id
        from evidence e where e.result_id = ${
          config.old_result_id
        } and is_active > 0
      `,
      insertQuery: `
      insert into evidence (
        description,
        is_active,
        creation_date,
        last_updated_date,
        created_by,
        last_updated_by,
        gender_related,
        nutrition_related,
        environmental_biodiversity_related,
        poverty_related,
        link,
        youth_related,
        is_supplementary,
        is_sharepoint,
        result_id,
        knowledge_product_related,
        evidence_type_id
        ) select
        e.description,
        e.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as creation_date,
        e.last_updated_date,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        e.gender_related,
        e.nutrition_related,
        e.environmental_biodiversity_related,
        e.poverty_related,
        e.link,
        e.youth_related,
        e.is_supplementary,
        e.is_sharepoint,
        ${config.new_result_id} as result_id,
        ${VERSIONING.QUERY.Get_result_phases(
          `e.knowledge_product_related`,
          config.phase,
        )} as knowledge_product_related,
        e.evidence_type_id
        from evidence e where e.result_id = ${
          config.old_result_id
        } and is_active > 0`,
      returnQuery: `
        select e.* from evidence e where e.result_id = ${config.new_result_id}
        `,
    };
  }
  private readonly _logger: Logger = new Logger(EvidencesRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Evidence, dataSource.createEntityManager());
  }

  fisicalDeleteByEvidenceIdAndResultId(
    resultId: number,
    evidenceId: EvidenceTypeEnum[],
  ): Promise<any> {
    const queryData = `delete e from evidence e where e.result_id = ? and e.evidence_type_id in (?);`;
    return this.query(queryData, [resultId, evidenceId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: EvidencesRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete e from evidence e where e.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: EvidencesRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<Evidence> {
    const queryData = `update evidence set is_active = 0 where result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: EvidencesRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  async getPictures(resultId: number) {
    const queryData = `
    SELECT 
      e.id,
      e.link,
      e.evidence_type_id,
      e.result_id,
      e.is_active
    FROM evidence e 
    WHERE e.result_id = ?
      AND e.evidence_type_id = 3;
    `;
    try {
      const evidence: Evidence[] = await this.query(queryData, [resultId]);
      return evidence;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getMaterials(resultId: number) {
    const queryData = `
    SELECT 
      e.id,
      e.link,
      e.evidence_type_id,
      e.result_id,
      e.is_active
    FROM evidence e 
    WHERE e.result_id = ?
      AND e.evidence_type_id = 4;
    `;
    try {
      const evidence: Evidence[] = await this.query(queryData, [resultId]);
      return evidence;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getWokrshop(resultId: number) {
    const queryData = `
    SELECT 
      e.id,
      e.link,
      e.evidence_type_id,
      e.result_id,
      e.is_active
    FROM evidence e 
    WHERE e.result_id = ?
      AND e.evidence_type_id = 5;
    `;
    try {
      const evidence: Evidence[] = await this.query(queryData, [resultId]);
      return evidence;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getEvidenceFull(evidenceId: number) {
    const queryData = `
    select 
    	e.id,
    	e.link,
    	e.description,
    	e.is_active,
    	e.creation_date,
    	e.last_updated_date,
    	e.created_by,
    	e.last_updated_by,
    	e.gender_related,
    	e.result_evidence_id
    from evidence e 
    where e.id = ?
    	and e.is_active > 0;
    `;
    try {
      const completeUser: Evidence[] = await this.query(queryData, [
        evidenceId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getEvidencesByResultIdAndLink(
    resultId: number,
    evidenceId: string,
    is_supplementary: boolean,
    type: number,
  ) {
    const query = `
    select 
    e.id,
    e.link,
    e.result_id 
    from evidence e 
    where e.result_id = ?
    	and e.is_active > 0
      and e.is_supplementary = ?
      and e.id = ?
      and e.evidence_type_id = ?;
    `;

    try {
      const evidence: Evidence[] = await this.query(query, [
        resultId,
        is_supplementary,
        evidenceId,
        type,
      ]);
      return evidence?.length ? evidence[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateEvidences(
    resultId: number,
    evidenceIdList: string[],
    userId: number,
    is_supplementary: boolean,
    type: number,
  ) {
    evidenceIdList = evidenceIdList ?? [];
    const evidenceIdListString = evidenceIdList.filter((e) => e).join(',');

    const inactiveAll = `
      UPDATE evidence
      SET is_active = 0,
        last_updated_date = NOW(),
        last_updated_by = ${userId}
      WHERE is_active > 0
        AND result_id = ${resultId}
        AND is_supplementary = ${is_supplementary}
        AND evidence_type_id = ${type};
    `;

    let justActivateList = '';
    if (evidenceIdListString) {
      justActivateList = `
        UPDATE evidence
        SET is_active = 1,
          last_updated_date = NOW(),
          last_updated_by = ${userId}
        WHERE result_id = ${resultId}
          AND id IN (${evidenceIdListString})
          AND is_supplementary = ${is_supplementary}
          AND evidence_type_id = ${type};
      `;
    }

    try {
      await this.query(inactiveAll);
      if (justActivateList) {
        await this.query(justActivateList);
      }
    } catch (error) {
      this._logger.error(error);
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getLastSharepointId() {
    const query = `
    SELECT MAX(id) as id
    FROM evidence_sharepoint es
    `;

    try {
      const evidenceSharepointId: any = await this.query(query);
      return evidenceSharepointId[0].id;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultInformation(resultId) {
    const query = `
    SELECT
      r.result_code,
      r.id as result_id,
      r.title as result_title,
      v.phase_name,
      DATE_FORMAT(CONVERT_TZ(now(), '+00:00', '+02:00'), '%Y%m%d%H%i') as date_as_name
    FROM result r
      LEFT JOIN version v ON v.id = r.version_id  
    WHERE 
      r.is_active > 0 AND r.id = ?;`;

    try {
      const result: any = await this.query(query, [resultId]);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getEvidencesByResultId(
    resultId: number,
    is_supplementary: boolean,
    type: number,
  ) {
    const query = `
    SELECT 
    e.id,
    es.id AS sp_evidence_id,
    es.document_id AS sp_document_id,
    es.file_name AS sp_file_name,
    es.folder_path AS sp_folder_path,
    es.is_public_file,
    e.description,
    e.is_active,
    e.creation_date,
    e.last_updated_date,
    e.created_by,
    e.last_updated_by,
    e.gender_related,
    e.link,
    e.is_sharepoint,
    e.youth_related,
    e.nutrition_related,
    e.environmental_biodiversity_related,
    e.poverty_related,
    e.is_supplementary,
    e.result_id,
    e.knowledge_product_related 
    FROM evidence e 
    LEFT JOIN (
        SELECT es1.*
        FROM evidence_sharepoint es1
        INNER JOIN (
            SELECT evidence_id, MAX(created_date) AS max_created_date
            FROM evidence_sharepoint
            WHERE is_active > 0
            GROUP BY evidence_id
        ) es2 ON es1.evidence_id = es2.evidence_id AND es1.created_date = es2.max_created_date
        WHERE es1.is_active > 0
    ) es ON e.id = es.evidence_id
    WHERE e.result_id = ?
      AND e.is_supplementary = ?
      AND e.is_active > 0
      AND e.evidence_type_id = ?
    ORDER BY e.creation_date ASC;
    `;

    try {
      const evidence: EvidenceWithEvidenceSharepoint[] = await this.query(
        query,
        [resultId, is_supplementary, type],
      );
      return evidence;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
