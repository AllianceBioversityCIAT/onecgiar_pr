import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsKnowledgeProduct } from '../entities/results-knowledge-product.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsKnowledgeProductsRepository
  extends BaseRepository<ResultsKnowledgeProduct>
  implements
    ReplicableInterface<ResultsKnowledgeProduct>,
    LogicalDelete<ResultsKnowledgeProduct>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsKnowledgeProduct>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
        null as result_knowledge_product_id,
        rkp.handle,
        rkp.name,
        rkp.description,
        rkp.knowledge_product_type,
        rkp.licence,
        rkp.comodity,
        rkp.sponsors,
        rkp.findable,
        rkp.accesible,
        rkp.interoperable,
        rkp.reusable,
        rkp.is_melia,
        rkp.melia_previous_submitted,
        rkp.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as results_id,
        rkp.melia_type_id,
        ${config.user.id} as created_by,
        null as last_updated_by,
        rkp.doi,
        rkp.cgspace_regions,
        rkp.cgspace_countries,
        rkp.ost_melia_study_id
        from results_knowledge_product rkp WHERE rkp.results_id = ${
          config.old_result_id
        } and rkp.is_active > 0
      `,
      insertQuery: `
      insert into results_knowledge_product (
        handle,
        name,
        description,
        knowledge_product_type,
        licence,
        comodity,
        sponsors,
        findable,
        accesible,
        interoperable,
        reusable,
        is_melia,
        melia_previous_submitted,
        is_active,
        created_date,
        last_updated_date,
        results_id,
        melia_type_id,
        created_by,
        last_updated_by,
        doi,
        cgspace_regions,
        cgspace_countries,
        ost_melia_study_id
        )
        select 
        rkp.handle,
        rkp.name,
        rkp.description,
        rkp.knowledge_product_type,
        rkp.licence,
        rkp.comodity,
        rkp.sponsors,
        rkp.findable,
        rkp.accesible,
        rkp.interoperable,
        rkp.reusable,
        rkp.is_melia,
        rkp.melia_previous_submitted,
        rkp.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as results_id,
        rkp.melia_type_id,
        ${config.user.id} as created_by,
        null as last_updated_by,
        rkp.doi,
        rkp.cgspace_regions,
        rkp.cgspace_countries,
        rkp.ost_melia_study_id
        from results_knowledge_product rkp WHERE rkp.results_id = ${
          config.old_result_id
        } and rkp.is_active > 0`,
      returnQuery: `
        select * from results_knowledge_product rkp WHERE rkp.results_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductsRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProduct, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rkp from results_knowledge_product rkp where rkp.results_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductsRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsKnowledgeProduct> {
    const dataQuery = `update results_knowledge_product set is_active = 0 where results_id = ?`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductsRepository.name,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsKnowledgeProduct>,
  ): Promise<ResultsKnowledgeProduct> {
    let final_data: ResultsKnowledgeProduct = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
          null as result_knowledge_product_id,
          rkp.handle,
          rkp.name,
          rkp.description,
          rkp.knowledge_product_type,
          rkp.licence,
          rkp.comodity,
          rkp.sponsors,
          rkp.findable,
          rkp.accesible,
          rkp.interoperable,
          rkp.reusable,
          rkp.is_melia,
          rkp.melia_previous_submitted,
          rkp.is_active,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          null as last_updated_date,
          ? as results_id,
          rkp.melia_type_id,
          ? as created_by,
          null as last_updated_by,
          rkp.doi,
          rkp.cgspace_regions,
          rkp.cgspace_countries,
          rkp.ost_melia_study_id
          from results_knowledge_product rkp WHERE rkp.results_id = ? and rkp.is_active > 0
        `;
        const response = await (<Promise<ResultsKnowledgeProduct[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsKnowledgeProduct>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into results_knowledge_product (
          handle,
          name,
          description,
          knowledge_product_type,
          licence,
          comodity,
          sponsors,
          findable,
          accesible,
          interoperable,
          reusable,
          is_melia,
          melia_previous_submitted,
          is_active,
          created_date,
          last_updated_date,
          results_id,
          melia_type_id,
          created_by,
          last_updated_by,
          doi,
          cgspace_regions,
          cgspace_countries,
          ost_melia_study_id
          )
          select 
          rkp.handle,
          rkp.name,
          rkp.description,
          rkp.knowledge_product_type,
          rkp.licence,
          rkp.comodity,
          rkp.sponsors,
          rkp.findable,
          rkp.accesible,
          rkp.interoperable,
          rkp.reusable,
          rkp.is_melia,
          rkp.melia_previous_submitted,
          rkp.is_active,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          null as last_updated_date,
          ? as results_id,
          rkp.melia_type_id,
          ? as created_by,
          null as last_updated_by,
          rkp.doi,
          rkp.cgspace_regions,
          rkp.cgspace_countries,
          rkp.ost_melia_study_id
          from results_knowledge_product rkp WHERE rkp.results_id = ? and rkp.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select 
        rkp.result_knowledge_product_id,
        rkp.handle,
        rkp.name,
        rkp.description,
        rkp.knowledge_product_type,
        rkp.licence,
        rkp.comodity,
        rkp.sponsors,
        rkp.findable,
        rkp.accesible,
        rkp.interoperable,
        rkp.reusable,
        rkp.is_melia,
        rkp.melia_previous_submitted,
        rkp.is_active,
        rkp.created_date,
        rkp.last_updated_date,
        rkp.results_id,
        rkp.melia_type_id,
        rkp.created_by,
        rkp.last_updated_by,
        rkp.doi,
        rkp.cgspace_regions,
        rkp.cgspace_countries,
        rkp.ost_melia_study_id
        from results_knowledge_product rkp WHERE rkp.results_id = ?`;
        const temp = await (<Promise<ResultsKnowledgeProduct[]>>(
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

    config.f?.completeFunction?.(final_data);

    return final_data;
  }

  async getSectionSevenDataForReport(
    resultCodesArray: number[],
    phase?: number,
  ) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const queryData = `
    select 
      -- result basic data
      r.id 'Result ID', 
      r.result_code 'Result Code',
      -- kp specific data
      concat('hdl.handle.net/',rkp.handle) 'Handle',
      rkp.knowledge_product_type 'Knowledge product type',
      group_concat(distinct rka.author_name separator '; ') 'Authors (semicolon separated)',
      rkp.licence 'License',
      group_concat(distinct agrovoc.keyword separator '; ') 'AGROVOC keywords (semicolon separated)',
      group_concat(distinct keyword.keyword separator '; ') 'Regular keywords (semicolon separated)',
      rkp.comodity 'Commodities (semicolon separated)',
      rkp.sponsors 'Sponsors (semicolon separated)',
      -- kp metadata (m-qap)
      group_concat(distinct concat('Is Core Collection? ', if(coalesce(cgspace.is_isi ,0) = 0, 'No', 'Yes'), '; Accessibility: ', cgspace.accesibility,'; Year: ', cgspace.\`year\`, '; DOI: ', cgspace.doi, '; Is Peer Reviewed? ', if(coalesce(cgspace.is_peer_reviewed ,0) = 0, 'No', 'Yes')) separator '; ') "CGSpace Metadata",
      group_concat(distinct concat('Is Core Collection? ', if(coalesce(wos.is_isi ,0) = 0, 'No', 'Yes'), '; Accessibility: ', wos.accesibility,'; Year: ', wos.\`year\`, '; DOI: ', wos.doi, '; Is Peer Reviewed? ', if(coalesce(wos.is_peer_reviewed ,0) = 0, 'No', 'Yes'))separator '; ') "WoS Metadata",
      -- altmetrics data
      concat('altmetric.com/details/',altmetrics.altmetric_id) 'Altmetric Details URL',
      altmetrics.score 'Altmetrics score',
      -- fair (most recent)
      format(rkp.findable, 2) 'Findable',
      format(rkp.accesible, 2) 'Accesible',
      format(rkp.interoperable, 2) 'Interoperable',
      format(rkp.reusable, 2) 'Reusable'
    from 
      result r  
    join result_type rt on r.result_type_id = rt.id 
    left join results_knowledge_product rkp on rkp.results_id = r.id and rkp.is_active
    left join results_kp_metadata cgspace on cgspace.result_knowledge_product_id = rkp.result_knowledge_product_id and cgspace.source = 'CGSpace' and cgspace.is_active = 1 
    left join results_kp_metadata wos on wos.result_knowledge_product_id = rkp.result_knowledge_product_id and wos.source = 'WOS' and wos.is_active = 1
    left join results_kp_authors rka on rka.result_knowledge_product_id = rkp.result_knowledge_product_id and rka.is_active = 1
    left join results_kp_keywords agrovoc on agrovoc.result_knowledge_product_id = rkp.result_knowledge_product_id and agrovoc.is_active = 1 and agrovoc.is_agrovoc = 1
    left join results_kp_keywords keyword on keyword.result_knowledge_product_id = rkp.result_knowledge_product_id and keyword.is_active = 1 and keyword.is_agrovoc = 0
    left join results_kp_altmetrics altmetrics on altmetrics.result_knowledge_product_id = rkp.result_knowledge_product_id and altmetrics.is_active = 1
    where 
      r.is_active 
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
      ${phase ? `and r.version_id = ${phase}` : ''}
      and	rt.name = 'Knowledge Product'
    group by 1, 2, 3, 4, 6, 9, 10, 13, 14, 15, 16, 17, 18
    order by 1
    ;
    `;
    try {
      const resultTocResult = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async statusElement(kpId: number, status: boolean) {
    const query = `
    UPDATE results_knowledge_product 
    SET is_active = ?
    WHERE result_knowledge_product_id = ?;
    `;
    try {
      return await this.query(query, [status ? 1 : 0, kpId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductsRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
