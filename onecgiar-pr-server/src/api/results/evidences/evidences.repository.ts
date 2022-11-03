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

  async getEvidencesByResultIdAnd(resultId: number, link: string){
    const query = `
    select 
    e.id,
    e.link,
    e.result_id 
    from evidence e 
    where e.result_id = ?
    	and e.is_active > 0
    	and e.link = ?;
    `;

    try {
      const evidence: Evidence[] = await this.query(query, [resultId, link]);
      return evidence?.length?evidence[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateLink(resultId: number, linkArray: string[], userId: number) {
    const evidences = linkArray??[];
    const upDateInactive = `
      update evidence 
      set is_active = 0, 
        last_updated_date  = NOW(),
        last_updated_by  = ?
      where is_active  > 0 
        and result_id = ?
        and link not in (${`'${evidences.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateActive = `
      update evidence 
      set is_active = 1, 
        last_updated_date  = NOW(),
        last_updated_by  = ?
      where result_id = ?
        and link in (${`'${evidences.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateAllInactive = `
      update evidence 
      set is_active = 0, 
        last_updated_date  = NOW(),
        last_updated_by  = ?
      where is_active  > 0 
      and result_id = ?;
    `;

    try {
      if(evidences?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId
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
}
