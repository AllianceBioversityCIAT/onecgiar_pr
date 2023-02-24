import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductAltmetric } from '../entities/results-knowledge-product-altmetrics.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsKnowledgeProductAltmetricRepository extends Repository<ResultsKnowledgeProductAltmetric> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
    ) {
    super(ResultsKnowledgeProductAltmetric, dataSource.createEntityManager());
  }

  async statusElement(kpId: number, status: boolean){
    const query = `
      UPDATE results_kp_altmetrics 
      SET is_active = ?
      WHERE result_knowledge_product_id = ?;
    `;
    try{
      return await this.query(query, [status?1:0, kpId]);
    }catch(error){
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductAltmetricRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
