import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpEoiOutcome } from '../entities/result-ip-eoi-outcome.entity';

@Injectable()
export class ResultIpEoiOutcomeRepository extends Repository<ResultIpEoiOutcome> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpEoiOutcome, dataSource.createEntityManager());
  }

  async getEoiOutcomes(resultByInnovationPackageId: number) {
    const query = `
    SELECT 
      rieo.toc_result_id,
      (
        SELECT
          tr.title
        FROM toc_result tr
        WHERE toc_result_id = rieo.toc_result_id
      ) AS title
    FROM
      result_ip_eoi_outcomes rieo
    WHERE rieo.is_active > 0
        AND result_by_innovation_package_id = ?
    `;

    try {
      const eoiOutcome: any[] = await this.query(query, [resultByInnovationPackageId]);
      console.log("🚀 ~ file: result-ip-eoi-outcomes.repository.ts:33 ~ ResultIpEoiOutcomeRepository ~ getEoiOutcomes ~ eoiOutcome:", eoiOutcome)
      return eoiOutcome;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpEoiOutcomeRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
