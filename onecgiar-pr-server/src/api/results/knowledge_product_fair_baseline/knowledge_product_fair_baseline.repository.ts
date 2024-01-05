import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeProductFairBaseline } from './entities/knowledge_product_fair_baseline.entity';
import { OnlyFisicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class KnowledgeProductFairBaselineRepository
  extends Repository<KnowledgeProductFairBaseline>
  implements OnlyFisicalDelete
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(KnowledgeProductFairBaseline, dataSource.createEntityManager());
  }

  fisicalDeleteLegacy(resultId: number): Promise<any> {
    const dataQuery = `delete kpfb from knowledge_product_fair_baseline kpfb
    inner join results_knowledge_product rkp on rkp.result_knowledge_product_id = kpfb.knowledge_product_id 
  where rkp.results_id = ?`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) => {
        return this._handlersError.returnErrorRepository({
          error: err,
          className: KnowledgeProductFairBaselineRepository.name,
          debug: true,
        });
      });
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rkfb from results_kp_fair_baseline rkfb 
    inner join results_knowledge_product rkp on rkp.result_knowledge_product_id = rkfb.knowledge_product_id 
  where rkp.results_id = ?`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) => {
        return this._handlersError.returnErrorRepository({
          error: err,
          className: KnowledgeProductFairBaselineRepository.name,
          debug: true,
        });
      });
  }
}
