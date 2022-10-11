import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Evidence } from './entities/evidence.entity';

@Injectable()
export class EvidencesRepository extends Repository<Evidence> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
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
      const completeUser: Evidence[] = await this.query(queryData, [evidenceId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: EvidencesRepository.name,
        error: error,
        debug: true
      });
    }
  }

}