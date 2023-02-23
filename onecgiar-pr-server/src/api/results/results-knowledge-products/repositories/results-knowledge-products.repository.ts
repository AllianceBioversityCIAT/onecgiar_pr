import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsKnowledgeProduct } from '../entities/results-knowledge-product.entity';

@Injectable()
export class ResultsKnowledgeProductsRepository extends Repository<ResultsKnowledgeProduct> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProduct, dataSource.createEntityManager());
  }

  async getSectionSevenDataForReport(resultCodesArray: number[]) {
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

  async statusElement(kpId: number, status: boolean){
    const query = `
    UPDATE results_knowledge_product 
    SET is_active = ?
    WHERE result_knowledge_product_id = ?;
    `;
    try{
      return await this.query(query, [status?1:0, kpId]);
    }catch(error){
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductsRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
