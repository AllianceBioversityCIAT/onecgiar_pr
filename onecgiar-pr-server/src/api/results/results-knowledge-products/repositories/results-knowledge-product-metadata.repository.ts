import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductMetadata } from '../entities/results-knowledge-product-metadata.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsKnowledgeProductMetadataRepository extends Repository<ResultsKnowledgeProductMetadata> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(ResultsKnowledgeProductMetadata, dataSource.createEntityManager());
  }

  async statusElement(kpId: number, status: boolean){
    const query = `
    UPDATE results_kp_metadata 
    SET is_active = ?
    WHERE result_knowledge_product_id = ?;
    `;
    try{
      return await this.query(query, [status?1:0, kpId]);
    }catch(error){
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductMetadataRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
