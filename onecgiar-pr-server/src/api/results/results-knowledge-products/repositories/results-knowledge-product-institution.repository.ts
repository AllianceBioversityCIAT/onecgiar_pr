import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductInstitution } from '../entities/results-knowledge-product-institution.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { VERSIONING } from 'src/shared/utils/versioning.utils';

@Injectable()
export class ResultsKnowledgeProductInstitutionRepository
  extends Repository<ResultsKnowledgeProductInstitution>
  implements ReplicableInterface<ResultsKnowledgeProductInstitution>
{
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductInstitutionRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProductInstitution, dataSource.createEntityManager());
  }
  async replicable(
    config: ReplicableConfigInterface<ResultsKnowledgeProductInstitution>,
  ): Promise<ResultsKnowledgeProductInstitution> {
    let final_data: ResultsKnowledgeProductInstitution = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        SELECT 
        null as result_kp_mqap_institution_id,
        rkmqi.intitution_name,
        rkmqi.confidant,
        rkmqi.is_active,
        now() as created_date,
        null as last_updated_date,
        ${VERSIONING.QUERY.Get_kp_phases(
          config.new_result_id,
        )} as result_knowledge_product_id,
        rkmqi.predicted_institution_id,
        rkmqi.results_by_institutions_id,
        ? as version_id,
        ? as created_by,
        null as last_updated_by
        from results_kp_mqap_institutions rkmqi where rkmqi.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
          config.old_result_id,
        )}
        and rkmqi.is_active > 0`;
        const response = await (<Promise<ResultsKnowledgeProductInstitution[]>>(
          this.query(queryData, [config.phase, config.user.id])
        ));
        const response_edit = <ResultsKnowledgeProductInstitution>(
          config.f.custonFunction(response?.length ? response[0] : null)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData: string = `
        INSERT into results_kp_mqap_institutions 
        (
        intitution_name,
        confidant,
        is_active,
        created_date,
        last_updated_date,
        result_knowledge_product_id,
        predicted_institution_id,
        results_by_institutions_id,
        version_id,
        created_by,
        last_updated_by
        )
        SELECT 
        rkmqi.intitution_name,
        rkmqi.confidant,
        rkmqi.is_active,
        now() as created_date,
        null as last_updated_date,
        ${VERSIONING.QUERY.Get_kp_phases(
          config.new_result_id,
        )} as result_knowledge_product_id,
        rkmqi.predicted_institution_id,
        rkmqi.results_by_institutions_id,
        ? as version_id,
        ? as created_by,
        null as last_updated_by
        from results_kp_mqap_institutions rkmqi where rkmqi.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
          config.old_result_id,
        )}
        and rkmqi.is_active > 0`;
        await this.query(queryData, [config.phase, config.user.id]);

        const queryFind = `
        SELECT 
        rkmqi.result_kp_mqap_institution_id,
        rkmqi.intitution_name,
        rkmqi.confidant,
        rkmqi.is_active,
        rkmqi.created_date,
        rkmqi.last_updated_date,
        rkmqi.result_knowledge_product_id,
        rkmqi.predicted_institution_id,
        rkmqi.results_by_institutions_id,
        rkmqi.version_id,
        rkmqi.created_by,
        rkmqi.last_updated_by
        from results_kp_mqap_institutions rkmqi where rkmqi.result_knowledge_product_id = ${VERSIONING.QUERY.Get_kp_phases(
          config.new_result_id,
        )}`;
        const temp = await (<Promise<ResultsKnowledgeProductInstitution[]>>(
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
    UPDATE results_kp_mqap_institutions
    SET is_active = ?
    WHERE result_knowledge_product_id  = ?;
    `;
    try {
      return await this.query(query, [status ? 1 : 0, kpId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductInstitutionRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
