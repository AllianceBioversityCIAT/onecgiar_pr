import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductAuthor } from '../entities/results-knowledge-product-authors.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  VERSIONING,
  predeterminedDateValidation,
} from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsKnowledgeProductAuthorRepository
  extends BaseRepository<ResultsKnowledgeProductAuthor>
  implements
    ReplicableInterface<ResultsKnowledgeProductAuthor>,
    LogicalDelete<ResultsKnowledgeProductAuthor>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsKnowledgeProductAuthor>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as result_kp_author_id,
      rkpa.author_name,
      rkpa.orcid,
      rkpa.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${VERSIONING.QUERY.Get_kp_phases(
        config.new_result_id,
      )} as result_knowledge_product_id,
      ${config.user.id} as created_by,
      null as last_updated_by
      from results_kp_authors rkpa where rkpa.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
        config.old_result_id,
      )} and rkpa.is_active > 0
      `,
      insertQuery: `
      select 
      null as result_kp_author_id,
      rkpa.author_name,
      rkpa.orcid,
      rkpa.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${VERSIONING.QUERY.Get_kp_phases(
        config.new_result_id,
      )} as result_knowledge_product_id,
      ${config.user.id} as created_by,
      null as last_updated_by
      from results_kp_authors rkpa where rkpa.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
        config.old_result_id,
      )} and rkpa.is_active > 0
      `,
      returnQuery: `
      select 
      rkpa.*
      from results_kp_authors rkpa where rkpa.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
        config.new_result_id,
      )}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductAuthorRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProductAuthor, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rka from results_kp_authors rka 
    inner join results_knowledge_product rkp on rka.result_knowledge_product_id = rkp.result_knowledge_product_id 
      where rkp.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductAuthorRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsKnowledgeProductAuthor> {
    const queryData = `update results_kp_authors rka 
    inner join results_knowledge_product rkp on rka.result_knowledge_product_id = rkp.result_knowledge_product_id 
      set rka.is_active = 0
      where rkp.results_id = ?
        and rka.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductAuthorRepository.name,
          debug: true,
        }),
      );
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
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
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
        const queryData = `
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
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
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

    config.f?.completeFunction?.({ ...final_data });

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
