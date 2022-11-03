import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Evidence } from './entities/evidence.entity';

@Injectable()
export class EvidencesRepository extends Repository<Evidence> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Evidence, dataSource.createEntityManager());
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
    	e.version_id,
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

  async getEvidencesByResultIdAndLink(resultId: number, link: string, is_supplementary: boolean){
    const query = `
    select 
    e.id,
    e.link,
    e.result_id 
    from evidence e 
    where e.result_id = ?
    	and e.is_active > 0
    	and e.link = ?
      and is_supplementary = ?;
    `;

    try {
      const evidence: Evidence[] = await this.query(query, [resultId, link, is_supplementary]);
      return evidence?.length?evidence[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateEvidences(resultId: number, linkArray: string[], userId: number, is_supplementary: boolean) {
    const evidences = linkArray??[];
    const upDateInactive = `
      update evidence 
      set is_active = 0, 
        last_updated_date  = NOW(),
        last_updated_by  = ?
      where is_active  > 0 
        and result_id = ?
        and link not in (${`'${evidences.toString().replace(/,/g,'\',\'')}'`})
        and is_supplementary = ?;
    `;

    const upDateActive = `
      update evidence 
      set is_active = 1, 
        last_updated_date  = NOW(),
        last_updated_by  = ?
      where result_id = ?
        and link in (${`'${evidences.toString().replace(/,/g,'\',\'')}'`})
        and is_supplementary = ?;
    `;

    const upDateAllInactive = `
      update evidence 
      set is_active = 0, 
        last_updated_date  = NOW(),
        last_updated_by  = ?
      where is_active  > 0 
      and result_id = ?
      and is_supplementary = ?;
    `;

    try {
      if(evidences?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId, is_supplementary
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId, is_supplementary
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId, is_supplementary
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: `updateEvidences ${error}`,
        debug: true,
      });
    }
  }

  async getEvidencesByResultId(resultId: number, is_supplementary: boolean){
    const query = `
    select 
    e.id,
    e.description,
    e.is_active,
    e.creation_date,
    e.last_updated_date,
    e.version_id,
    e.created_by,
    e.last_updated_by,
    e.gender_related,
    e.link,
    e.youth_related,
    e.is_supplementary,
    e.result_id,
    e.knowledge_product_related 
    from evidence e 
    where e.result_id = ?
      and e.is_supplementary = ?
      and e.is_active > 0;
    `;

    try {
      const evidence: Evidence[] = await this.query(query, [resultId, is_supplementary]);
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
