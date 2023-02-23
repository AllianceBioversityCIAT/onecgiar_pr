import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductInstitution } from '../entities/results-knowledge-product-institution.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsKnowledgeProductInstitutionRepository extends Repository<ResultsKnowledgeProductInstitution> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(ResultsKnowledgeProductInstitution, dataSource.createEntityManager());
  }

  async statusElement(kpId: number, status: boolean){
    const query = `
    UPDATE results_kp_mqap_institutions
    SET is_active = ?
    WHERE result_knowledge_product_id  = ?;
    `;
    try{
      return await this.query(query, [status?1:0, kpId]);
    }catch(error){
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductInstitutionRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
