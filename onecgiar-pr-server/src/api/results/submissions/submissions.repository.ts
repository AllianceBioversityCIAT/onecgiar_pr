import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Submission } from './entities/submission.entity';

@Injectable()
export class submissionRepository extends Repository<Submission>{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
	super(Submission, dataSource.createEntityManager());
  }

  async submissionsByResult(resultId: number) {
    const queryData = `
    	SELECT
			s.id,
			s.status,
			s.comment,
			s.is_active,
			s.created_date,
			s.results_id,
			s.user_id
		from
			submission s
		WHERE
			s.is_active > 0
			and s.results_id = ?;
    `;
    try {
      const submissionsByResult: Submission[] = await this.dataSource.query(queryData, [resultId]); 
	  return submissionsByResult;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: submissionRepository.name,
        error: error,
        debug: true,
      });
    }
  }


}

