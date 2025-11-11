import { Injectable, HttpStatus } from '@nestjs/common';
import { env } from 'process';
import { DataSource, Repository } from 'typeorm';
import { TocResult } from './entities/toc-result.entity';
import { Result } from '../../api/results/entities/result.entity';
import { Year } from '../../api/results/years/entities/year.entity';

@Injectable()
export class TocResultsRepository extends Repository<TocResult> {
  constructor(private dataSource: DataSource) {
    super(TocResult, dataSource.createEntityManager());
  }

  private async getCurrentTocPhaseId(): Promise<string | null> {
    const query = `
      SELECT toc_pahse_id
      FROM ${env.DB_NAME}.version
      WHERE is_active = 1 AND status = 1 AND app_module_id = 1
      LIMIT 1
    `;
    try {
      const rows = await this.dataSource.query(query);
      return rows?.[0]?.toc_pahse_id ?? null;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getCurrentTocPhaseId error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM toc_result;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocResults() {
    const queryData = `
    select 
    tr.toc_result_id ,
    tr.toc_internal_id ,
    tr.title,
    tr.description,
    tr.toc_type_id,
    tr.toc_level_id ,
    tr.inititiative_id ,
    tr.work_package_id 
    from toc_result tr;
    `;
    try {
      const tocResult: TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getAllTocResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async $_getResultTocByConfig(
    result_id: number,
    init_id: number,
    toc_level: number,
  ) {
    const queryData = `
    SELECT 
    tr.id as toc_result_id,
    tr.toc_result_id as toc_internal_id,
    tr.result_title as title,
    tr.result_description as description,
    tr.result_type as toc_type_id,
    tr.result_type as toc_level_id,
    ci.id  as inititiative_id,
    tr.work_packages_id as work_package_id,
    wp.acronym as wp_short_name
    FROM ${env.DB_TOC}.toc_results tr 
    LEFT JOIN ${env.DB_TOC}.work_packages wp ON wp.id = tr.work_packages_id
    											AND wp.active > 0
    LEFT JOIN clarisa_initiatives ci ON ci.toc_id = tr.id_toc_initiative
    WHERE tr.is_active > 0
    		AND ci.id = ?
    		AND tr.phase = (SELECT v.toc_pahse_id  FROM \`result\` r 
    						INNER JOIN \`version\` v ON v.id = r.version_id
    						WHERE r.id = ?
    							AND r.is_active > 0
    						LIMIT 1)
    		AND tr.result_type = ?
    ORDER by 
      wp.acronym,
      tr.result_title ASC;
    `;

    const queryOst = `
    select
    	null as toc_result_id,
    	ibs.initiativeId as inititiative_id ,
    	iaaoi.outcome_id as action_area_outcome_id,
    	caao.id,
    	caao.outcomeSMOcode as title,
    	caao.outcomeStatement as description,
    	4 as toc_level_id,
    	null as work_package_id,
    	gi.action_area_id,
      gi.action_area_description as action_area_name
    from
    	${env.DB_OST}.init_action_areas_out_indicators iaaoi
    inner join ${env.DB_OST}.initiatives_by_stages ibs on
    	ibs.id = iaaoi.initvStgId
    inner join ${env.DB_OST}.general_information gi on gi.initvStgId = ibs.id 
    inner join ${env.DB_NAME}.clarisa_action_area_outcome caao on
    	caao.id = iaaoi.outcome_id
    WHERE
    	iaaoi.outcome_id is not null
    	and ibs.initiativeId = ?
    GROUP by
    	ibs.initiativeId,
    	iaaoi.outcome_id,
    	gi.action_area_id,
    	gi.action_area_description
    order by caao.outcomeSMOcode ASC;
    `;
    const res = this.query(toc_level == 4 ? queryOst : queryData, [
      init_id,
      result_id,
      toc_level,
    ]);

    return res.then((data) => data).catch((_error) => []);
  }

  async getAllTocResultsByInitiative(initiativeId: number, tocLevel: number) {
    const queryData = `
    select DISTINCT
      tr.toc_result_id ,
      tr.toc_internal_id ,
      tr.title,
      tr.description,
      tr.toc_type_id,
      tr.toc_level_id ,
      tr.inititiative_id ,
      tr.work_package_id ,
      wp.acronym as wp_short_name,
      null as action_area_outcome_id
    from toc_result tr
    left join ${
      env.DB_OST
    }.work_packages wp on wp.wp_official_code = tr.work_package_id
                                            and wp.active > 0
    left join ${env.DB_OST}.initiatives_by_stages ibs on ibs.id = wp.initvStgId
	  where tr.inititiative_id = ?
    	and tr.toc_level_id = ?
      ${tocLevel != 3 ? `and ibs.stageId = 4` : ``}
      and tr.is_active > 0
    order by wp.acronym, tr.title ASC;
    `,
      queryOst = `
    select
    	null as toc_result_id,
    	ibs.initiativeId as inititiative_id ,
    	iaaoi.outcome_id as action_area_outcome_id,
    	caao.id,
    	caao.outcomeSMOcode as title,
    	caao.outcomeStatement as description,
    	4 as toc_level_id,
    	null as work_package_id,
    	gi.action_area_id,
      gi.action_area_description as action_area_name
    from
    	${env.DB_OST}.init_action_areas_out_indicators iaaoi
    inner join ${env.DB_OST}.initiatives_by_stages ibs on
    	ibs.id = iaaoi.initvStgId
    inner join ${env.DB_OST}.general_information gi on gi.initvStgId = ibs.id 
    inner join ${env.DB_NAME}.clarisa_action_area_outcome caao on
    	caao.id = iaaoi.outcome_id
    WHERE
    	iaaoi.outcome_id is not null
    	and ibs.initiativeId = ?
    GROUP by
    	ibs.initiativeId,
    	iaaoi.outcome_id,
    	gi.action_area_id,
    	gi.action_area_description
    order by caao.outcomeSMOcode ASC;
    `;

    try {
      const tocResult: TocResult[] = await this.query(
        tocLevel == 4 ? queryOst : queryData,
        [initiativeId, tocLevel],
      );
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocResultsFromOst() {
    const queryData = `
    select 
      r.id as toc_result_id,
      r.toc_result_id as toc_internal_id,
      r.result_title as title,
      r.result_description as description,
      r.result_type_id as toc_level_id,
      null as toc_type_id,
      i.id as inititiative_id,
      wp.wp_official_code as work_package_id,
      r.active as is_active
    from ${env.DB_OST}.results r
    left join ${env.DB_OST}.work_packages wp on r.work_package_id = wp.wp_official_code
      and r.initvStgId = wp.initvStgId
      and r.active > 0
    inner join ${env.DB_OST}.initiatives_by_stages ibs on ibs.id = r.initvStgId
    inner join ${env.DB_OST}.initiatives i on  ibs.initiativeId = i.id
    WHERE r.active > 0 
      and ibs.active > 0;
    `;
    try {
      const tocResult: TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async inactiveTocResult() {
    const queryData = 'UPDATE toc_result set is_active = 0;';
    try {
      const tocResult: TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => inactiveTocResult error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async updateDeprecateDataToc() {
    const queryData = `
    update
        results_toc_result rtr
      left join toc_result tr on
        tr.toc_result_id = rtr.toc_result_id
      left join toc_result tr2 on
        tr2.toc_internal_id = tr.toc_internal_id
        and tr2.is_active > 0
        and tr2.inititiative_id = tr.inititiative_id 
         set
        rtr.toc_result_id = IFNULL(tr2.toc_result_id, NULL)
      WHERE
        tr.is_active = 0;
    `;
    try {
      const tocResult: TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => inactiveTocResult error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllOutcomeByInitiative(initiativeId: number) {
    const queryData = `
    select  
      DISTINCT caaoi.outcome_id as action_area_outcome_id,
      ibs.initiativeId as inititiative_id ,
       caao.id,
       caao.outcomeSMOcode as title,
       caao.outcomeStatement as description,
       4 as toc_level_id,
        null as work_package_id,
        gi.action_area_id,
       gi.action_area_description as action_area_name
      from ${env.DB_OST}.general_information gi 
      inner join ${env.DB_OST}.initiatives_by_stages ibs on gi.initvStgId = ibs.id 
      													and ibs.active > 0
      inner join ${env.DB_OST}.clarisa_action_areas_outcomes_indicators caaoi on caaoi.action_area_id = gi.action_area_id
      inner join clarisa_action_area_outcome caao on caao.id = caaoi.outcome_id 
      where ibs.initiativeId = ?;
    `;
    try {
      const tocResult: TocResult[] = await this.query(queryData, [
        initiativeId,
      ]);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getFullInitiativeTocByResult(resultId: number) {
    const queryData = `
    select 
      rbi.result_id,
      rbi.inititiative_id,
      ci.toc_id 
      from results_by_inititiative rbi 
      inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id
      where rbi.result_id = ?
        and rbi.initiative_role_id = 1;
    `;
    try {
      const tocid = await this.query(queryData, [resultId]);
      return tocid;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getFullInitiativeTocByInitiative(initiativeId: number) {
    const queryData = `
    SELECT i.toc_id
    FROM clarisa_initiatives i
   WHERE i.id = ?
     AND active = 1;
    `;
    try {
      const tocid = await this.query(queryData, [initiativeId]);
      return tocid;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst by initiative error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async isTocResoultByInitiative(resultId: number, tResult: number) {
    const queryData = `
    select 
      tr.toc_result_id ,
      tr.toc_internal_id ,
      tr.title,
      tr.description,
      tr.toc_type_id,
      tr.toc_level_id ,
      tr.inititiative_id ,
      tr.work_package_id 
      from toc_result tr
      inner join results_by_inititiative rbi on rbi.inititiative_id = tr.inititiative_id 
      where rbi.initiative_role_id = 1
      and rbi.result_id = ${resultId}
      and tr.toc_result_id = ${tResult};
    `;
    try {
      const tocResult: TocResult[] = await this.query(queryData);
      return tocResult.length ? tocResult[0] : undefined;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getAllTocResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getEoiIp(initId: number) {
    const query = `
    SELECT
      *
    FROM toc_result
    WHERE inititiative_id = ?
      AND is_active > 0
      AND toc_level_id = 3
    `;

    try {
      const eoiOutcome: any[] = await this.query(query, [initId]);
      return eoiOutcome;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getAllTocResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async $_getResultTocByConfigV2(init_id: number, toc_level: number) {
    const categoryMap = {
      1: 'OUTPUT',
      2: 'OUTCOME',
      3: 'EOI',
    };

    const category = categoryMap[toc_level];
    if (!category) {
      throw {
        message: `Invalid toc level: ${toc_level}. Valid levels are 1 (OUTPUT), 2 (OUTCOME), 3 (EOI)`,
        response: {},
        status: HttpStatus.BAD_REQUEST,
      };
    }

    const tocPhaseId = await this.getCurrentTocPhaseId();

    const queryData = `
      SELECT DISTINCT
        tr.id AS toc_result_id,
        tr.toc_result_id AS toc_internal_id,
        tr.result_title AS title,
        tr.result_description AS description,
        tr.result_type AS toc_type_id,
        tr.result_type AS toc_level_id,
        ci.id AS inititiative_id,
        tr.wp_id AS work_package_id,
        wp.acronym AS wp_short_name,
        NULL AS action_area_outcome_id
      FROM ${env.DB_TOC}.toc_results tr
      LEFT JOIN ${env.DB_TOC}.toc_work_packages wp 
        ON wp.toc_id = tr.wp_id
      LEFT JOIN clarisa_initiatives ci 
        ON ci.official_code = tr.official_code
      WHERE tr.is_active > 0
        AND ci.id = ?
        AND tr.category = ?
        ${tocPhaseId ? 'AND tr.phase = ?' : ''}
      ORDER BY wp.acronym, tr.result_title ASC;
    `;

    const params: (string | number)[] = [init_id, category];
    if (tocPhaseId) {
      params.push(tocPhaseId);
    }

    try {
      const res = await this.query(queryData, params);
      return res;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => _getResultTocByConfigV2 error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getTocIndicatorsByResultIds(
    result: Result,
    year: Year,
    tocResultIds: Array<number | string>,
  ): Promise<
    Array<{
      toc_result_id: number;
      indicator_id: number;
      toc_result_indicator_id: string | null;
      related_node_id: string | null;
      indicator_description: string | null;
      unit_messurament: string | null;
      type_value: string | null;
      type_name: string | null;
      location: string | null;
      target_value: number | null;
    }>
  > {
    const numericIds = (tocResultIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (!numericIds.length) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(', ');

    const query = `
      SELECT
        tri.toc_results_id AS toc_result_id,
        tri.id AS indicator_id,
        tri.toc_result_indicator_id,
        tri.related_node_id,
        tri.indicator_description,
        tri.unit_messurament,
        tri.type_value,
        tri.type_name,
        tri.location,
        trit.target_value
      FROM ${env.DB_TOC}.toc_results_indicators tri
      JOIN ${env.DB_TOC}.toc_result_indicator_target trit
        ON trit.toc_result_indicator_id = tri.related_node_id
        AND trit.target_date = ${result.obj_version?.phase_year || year.year}
      WHERE
        tri.toc_results_id IN (${placeholders})
        AND tri.is_active = 1;
    `;

    try {
      return await this.query(query, numericIds);
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIndicatorsByResultIds error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultIndicatorMappings(
    resultId: number,
    initiativeId: number,
    tocResultIds: Array<number | string>,
  ): Promise<
    Array<{
      toc_result_id: number | null;
      result_toc_result_id: number | null;
      planned_result: boolean | null;
      toc_progressive_narrative: string | null;
      result_toc_result_indicator_id: number | null;
      toc_results_indicator_id: string | null;
      indicator_contributing: number | null;
      indicator_status: number | null;
    }>
  > {
    const numericIds = (tocResultIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (!numericIds.length) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(', ');

    const query = `
      SELECT
        rtr.toc_result_id,
        rtr.result_toc_result_id,
        rtr.planned_result,
        rtr.toc_progressive_narrative,
        rtri.result_toc_result_indicator_id,
        rtri.toc_results_indicator_id,
        rtri.indicator_contributing,
        rtri.status AS indicator_status
      FROM results_toc_result rtr
      LEFT JOIN results_toc_result_indicators rtri
        ON rtri.results_toc_results_id = rtr.result_toc_result_id
        AND rtri.is_active = 1
        AND rtri.is_not_aplicable = 0
      WHERE
        rtr.results_id = ?
        AND rtr.initiative_id = ?
        AND rtr.is_active = 1
        AND rtr.toc_result_id IN (${placeholders});
    `;

    try {
      return await this.query(query, [resultId, initiativeId, ...numericIds]);
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getResultIndicatorMappings error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocResultsByInitiativeV2(initiativeId: number, tocLevel: number) {
    const categoryMap = {
      1: 'OUTPUT',
      2: 'OUTCOME',
      3: 'EOI',
    };

    const category = categoryMap[tocLevel];
    if (!category) {
      throw {
        message: `Invalid toc level: ${tocLevel}. Valid levels are 1 (OUTPUT), 2 (OUTCOME), 3 (EOI)`,
        response: {},
        status: HttpStatus.BAD_REQUEST,
      };
    }

    const tocPhaseId = await this.getCurrentTocPhaseId();

    const queryData = `
      SELECT DISTINCT
        tr.id AS toc_result_id,
        tr.toc_result_id AS toc_internal_id,
        tr.result_title AS title,
        tr.result_description AS description,
        tr.result_type AS toc_type_id,
        tr.result_type AS toc_level_id,
        ci.id AS inititiative_id,
        tr.wp_id AS work_package_id,
        wp.acronym AS wp_short_name,
        NULL AS action_area_outcome_id
      FROM ${env.DB_TOC}.toc_results tr
      LEFT JOIN ${env.DB_TOC}.toc_work_packages wp 
        ON wp.toc_id = tr.wp_id
        AND wp.is_active > 0
      LEFT JOIN clarisa_initiatives ci 
        ON ci.toc_id = tr.id_toc_initiative
      WHERE ci.id = ?
        AND tr.category = ?
        AND tr.is_active > 0
        ${tocPhaseId ? 'AND tr.phase = ?' : ''}
      ORDER BY wp.acronym, tr.result_title ASC;
    `;

    const params: (string | number)[] = [initiativeId, category];
    if (tocPhaseId) {
      params.push(tocPhaseId);
    }

    try {
      const tocResult: TocResult[] = await this.query(queryData, params);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getAllTocResultsByInitiativeV2 error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
