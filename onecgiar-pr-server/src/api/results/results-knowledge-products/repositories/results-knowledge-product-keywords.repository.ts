import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductKeyword } from '../entities/results-knowledge-product-keywords.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsKnowledgeProductKeywordRepository extends Repository<ResultsKnowledgeProductKeyword> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(ResultsKnowledgeProductKeyword, dataSource.createEntityManager());
  }

  async statusElement(kpId: number, status: boolean){
    const query = `
    UPDATE results_kp_keywords  
    SET is_active  = ?
    WHERE result_knowledge_product_id = ?;
    `;
    try{
      return await this.query(query, [status?1:0, kpId]);
    }catch(error){
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductKeywordRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
