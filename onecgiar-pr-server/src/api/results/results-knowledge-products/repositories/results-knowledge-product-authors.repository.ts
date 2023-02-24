import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductAuthor } from '../entities/results-knowledge-product-authors.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsKnowledgeProductAuthorRepository extends Repository<ResultsKnowledgeProductAuthor> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(ResultsKnowledgeProductAuthor, dataSource.createEntityManager());
  }

  async statusElement(kpId: number, status: boolean){
    const query = `
      UPDATE results_kp_authors 
      SET is_active  = ?
      WHERE result_knowledge_product_id  = ?;
    `;
    try{
      return await this.query(query, [status?1:0, kpId]);
    }catch(error){
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductAuthorRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
