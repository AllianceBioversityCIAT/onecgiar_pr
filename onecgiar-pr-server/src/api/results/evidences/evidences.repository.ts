import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Evidence } from './entities/evidence.entity';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { VERSIONING } from '../../../shared/utils/versioning.utils';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { EvidenceWithEvidenceSharepoint } from './interfaces/evidence-with-evidence-sharepoint.interface';

@Injectable()
export class EvidencesRepository
  extends Repository<Evidence>
  implements ReplicableInterface<Evidence>, LogicalDelete<Evidence>
{
  private readonly _logger: Logger = new Logger(EvidencesRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Evidence, dataSource.createEntityManager());
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

  async replicable(
    config: ReplicableConfigInterface<Evidence>,
  ): Promise<Evidence[]> {
    let final_data: Evidence[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select
          null as id,
          e.description,
          e.is_active,
          now() as creation_date,
          e.last_updated_date,
          ? as created_by,
          ? as last_updated_by,
          e.gender_related,
          e.link,
          e.youth_related,
          e.nutrition_related,
          e.environmental_biodiversity_related,
          e.poverty_related,
          e.is_supplementary,
          ? as result_id,
          ${VERSIONING.QUERY.Get_result_phases(
            `e.knowledge_product_related`,
            config.phase,
          )} as knowledge_product_related,
          e.evidence_type_id
          from evidence e where e.result_id = ? and is_active > 0
        `;
        const response = await (<Promise<Evidence[]>>(
          this.query(queryData, [
            config.user.id,
            config.user.id,
            config.new_result_id,
            config.old_result_id,
          ])
        ));

        const response_edit = <Evidence[]>config.f.custonFunction(response);
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
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
          result_id,
          knowledge_product_related,
          evidence_type_id
          ) select
          e.description,
          e.is_active,
          now() as creation_date,
          e.last_updated_date,
          ? as created_by,
          ? as last_updated_by,
          e.gender_related,
          e.nutrition_related,
          e.environmental_biodiversity_related,
          e.poverty_related,
          e.link,
          e.youth_related,
          e.is_supplementary,
          ? as result_id,
          ${VERSIONING.QUERY.Get_result_phases(
            `e.knowledge_product_related`,
            config.phase,
          )} as knowledge_product_related,
          e.evidence_type_id
          from evidence e where e.result_id = ? and is_active > 0`;
        await this.query(queryData, [
          config.user.id,
          config.user.id,
          config.new_result_id,
          config.old_result_id,
        ]);
        const queryFind = `
        select
          e.id,
          e.description,
          e.is_active,
          e.creation_date,
          e.last_updated_date,
          e.created_by,
          e.last_updated_by,
          e.gender_related,
          e.link,
          e.youth_related,
          e.nutrition_related,
          e.environmental_biodiversity_related,
          e.poverty_related,
          e.is_supplementary,
          e.result_id,
          e.knowledge_product_related,
          e.evidence_type_id
          from evidence e where e.result_id = ?
        `;
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
    link: string,
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
    	and e.link = ?
      and e.is_supplementary = ?
      and e.evidence_type_id = ?;
    `;

    try {
      const evidence: Evidence[] = await this.query(query, [
        resultId,
        link,
        is_supplementary,
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
    linkArray: string[],
    userId: number,
    is_supplementary: boolean,
    type: number,
  ) {
    const evidences = linkArray ?? [];
    const upDateInactive = `
      update evidence 
      set is_active = 0, 
        last_updated_date  = NOW(),
        last_updated_by  = ${userId}
      where is_active  > 0 
        and result_id = ${resultId}
        and link not in (${`'${evidences.toString().replace(/,/g, "','")}'`})
        and is_supplementary = ${is_supplementary}
        and evidence_type_id = ${type};
    `;

    const upDateActive = `
      update evidence 
      set is_active = 1, 
        last_updated_date  = NOW(),
        last_updated_by  = ${userId}
      where result_id = ${resultId}
        and link in (${`'${evidences.toString().replace(/,/g, "','")}'`})
        and is_supplementary = ${is_supplementary}
        and evidence_type_id = ${type};
    `;

    const upDateAllInactive = `
      update evidence 
      set is_active = 0, 
        last_updated_date  = NOW(),
        last_updated_by  = ${userId}
      where is_active  > 0 
      and result_id = ${resultId}
      and is_supplementary = ${is_supplementary}
      and evidence_type_id = ${type};
    `;

    try {
      if (evidences?.length) {
        await this.query(upDateInactive);

        return await this.query(upDateActive);
      } else {
        return await this.query(upDateAllInactive);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: `updateEvidences ${error}`,
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
      r.is_active > 0 AND r.id = 6819;  `;

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
    es.id AS sp_id,
    es.document_id AS sp_document_id,
    es.file_name AS sp_file_name,
    es.folder_path AS sp_folder_path,
    es.is_public_file,
    es.evidence_id AS sp_evidence_id,
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

    console.log([resultId, is_supplementary, type]);

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
