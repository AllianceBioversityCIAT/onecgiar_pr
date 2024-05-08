import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultsKnowledgeProductMetadata } from '../entities/results-knowledge-product-metadata.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import {
  VERSIONING,
  predeterminedDateValidation,
} from '../../../../shared/utils/versioning.utils';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsKnowledgeProductMetadataRepository
  extends BaseRepository<ResultsKnowledgeProductMetadata>
  implements LogicalDelete<ResultsKnowledgeProductMetadata>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsKnowledgeProductMetadata>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT 
      null as result_kp_metadata_id,
      rkm.source,
      rkm.is_isi,
      rkm.accesibility,
      rkm.year,
      rkm.doi,
      rkm.is_peer_reviewed,
      rkm.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${VERSIONING.QUERY.Get_kp_phases(
        config.new_result_id,
      )} as result_knowledge_product_id,
      ${config.user.id} as created_by,
      null as last_updated_by
      from results_kp_metadata rkm WHERE rkm.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
        config.old_result_id,
      )}
      and rkm.is_active > 0`,
      insertQuery: `
      insert into results_kp_metadata 
      (
      source,
      is_isi,
      accesibility,
      \`year\`,
      doi,
      is_peer_reviewed,
      is_active,
      created_date,
      last_updated_date,
      result_knowledge_product_id,
      created_by,
      last_updated_by
      )
      SELECT
      rkm.source,
      rkm.is_isi,
      rkm.accesibility,
      rkm.year,
      rkm.doi,
      rkm.is_peer_reviewed,
      rkm.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${VERSIONING.QUERY.Get_kp_phases(
        config.new_result_id,
      )} as result_knowledge_product_id,
      ${config.user.id} as created_by,
      null as last_updated_by
      from results_kp_metadata rkm WHERE rkm.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
        config.old_result_id,
      )}
      and rkm.is_active > 0`,
      returnQuery: `
      SELECT 
      rkm.*
      from results_kp_metadata rkm WHERE rkm.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
        config.new_result_id,
      )}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductMetadataRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProductMetadata, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rkm from results_kp_metadata rkm 
    inner join results_knowledge_product rkp on rkm.result_knowledge_product_id = rkp.result_knowledge_product_id 
  where rkp.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductMetadataRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsKnowledgeProductMetadata> {
    const queryData = `update results_kp_metadata rkm 
    inner join results_knowledge_product rkp on rkm.result_knowledge_product_id = rkp.result_knowledge_product_id 
  set rkm.is_active = 0
  where rkp.results_id = ?
    and rkm.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductMetadataRepository.name,
          debug: true,
        }),
      );
  }

  async statusElement(kpId: number, status: boolean) {
    const query = `
    UPDATE results_kp_metadata 
    SET is_active = ?
    WHERE result_knowledge_product_id = ?;
    `;
    try {
      return await this.query(query, [status ? 1 : 0, kpId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductMetadataRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
