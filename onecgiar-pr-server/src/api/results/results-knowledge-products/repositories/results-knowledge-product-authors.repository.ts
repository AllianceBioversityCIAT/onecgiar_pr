import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductAuthor } from '../entities/results-knowledge-product-authors.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { VERSIONING } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultsKnowledgeProductAuthorRepository
  extends Repository<ResultsKnowledgeProductAuthor>
  implements ReplicableInterface<ResultsKnowledgeProductAuthor>
{
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductAuthorRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProductAuthor, dataSource.createEntityManager());
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsKnowledgeProductAuthor>,
  ): Promise<ResultsKnowledgeProductAuthor> {
    let final_data: ResultsKnowledgeProductAuthor = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
        null as result_kp_author_id,
        rkpa.author_name,
        rkpa.orcid,
        rkpa.is_active,
        now() as created_date,
        null as last_updated_date,
        ${VERSIONING.QUERY.Get_kp_phases(
          config.new_result_id,
        )} as result_knowledge_product_id,
        ? as created_by,
        null as last_updated_by
        from results_kp_authors rkpa where rkpa.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
          config.old_result_id,
        )} and rkpa.is_active > 0
        `;
        const response = await (<Promise<ResultsKnowledgeProductAuthor[]>>(
          this.query(queryData, [config.user.id])
        ));
        const response_edit = <ResultsKnowledgeProductAuthor>(
          config.f.custonFunction(response?.length ? response[0] : null)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData: string = `
        insert into results_kp_authors 
        (
        author_name,
        orcid,
        is_active,
        created_date,
        last_updated_date,
        result_knowledge_product_id,
        created_by,
        last_updated_by
        )
        select 
        rkpa.author_name,
        rkpa.orcid,
        rkpa.is_active,
        now() as created_date,
        null as last_updated_date,
        ${VERSIONING.QUERY.Get_kp_phases(
          config.new_result_id,
        )} as result_knowledge_product_id,
        ? as created_by,
        null as last_updated_by
        from results_kp_authors rkpa where rkpa.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
          config.old_result_id,
        )} and rkpa.is_active > 0`;
        await this.query(queryData, [config.user.id]);

        const queryFind = `
        select 
        rkpa.result_kp_author_id,
        rkpa.author_name,
        rkpa.orcid,
        rkpa.is_active,
        rkpa.created_date,
        rkpa.last_updated_date,
        rkpa.result_knowledge_product_id,
        rkpa.created_by,
        rkpa.last_updated_by
        from results_kp_authors rkpa where rkpa.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
          config.old_result_id,
        )}`;
        const temp = await (<Promise<ResultsKnowledgeProductAuthor[]>>(
          this.query(queryFind, [config.new_result_id])
        ));
        final_data = temp?.length ? temp[0] : null;
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction
      ? config.f.completeFunction({ ...final_data })
      : null;

    return final_data;
  }

  async statusElement(kpId: number, status: boolean) {
    const query = `
      UPDATE results_kp_authors 
      SET is_active  = ?
      WHERE result_knowledge_product_id  = ?;
    `;
    try {
      return await this.query(query, [status ? 1 : 0, kpId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductAuthorRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
