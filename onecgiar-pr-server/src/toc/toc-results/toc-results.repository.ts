import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { env } from 'node:process';
import { DataSource, Repository } from 'typeorm';
import { TocResult } from './entities/toc-result.entity';
import { Result } from '../../api/results/entities/result.entity';
import {
  getOtherTypesIndicatorPatterns,
  RESULT_TYPE_TO_INDICATOR_PATTERN,
} from '../../shared/constants/indicator-type-mapping.constant';
import { ClarisaInitiative } from '../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { GlobalParameter } from '../../api/global-parameter/entities/global-parameter.entity';
import {
  throwServiceError,
  formatUnknownError,
} from '../../shared/utils/service-error.util';

export type GetTocIndicatorsByResultIdsParams = {
  result: Result;
  targetYear: number;
  tocResultIds: Array<number | string>;
  resultTypeId?: number;
  linkedIndicatorNodeIds?: string[];
  resultId?: number;
  initId?: number;
  includeInactiveIndicators?: boolean;
  bilateral?: boolean;
};

@Injectable()
export class TocResultsRepository extends Repository<TocResult> {
  private readonly logger = new Logger(TocResultsRepository.name);

  constructor(private readonly dataSource: DataSource) {
    super(TocResult, dataSource.createEntityManager());
  }

  async getTocPhaseIdByVersionId(versionId: number): Promise<string | null> {
    if (!Number.isFinite(versionId) || versionId <= 0) {
      return null;
    }

    const query = `
      SELECT toc_pahse_id
      FROM ${env.DB_NAME}.version
      WHERE id = ?
      LIMIT 1
    `;

    try {
      const rows = await this.dataSource.query(query, [versionId]);
      const phaseId = rows?.[0]?.toc_pahse_id;
      if (phaseId === null || phaseId === undefined) {
        return null;
      }

      const normalized = String(phaseId).trim();
      return normalized || null;
    } catch (error) {
      throw new Error(
        `[${TocResultsRepository.name}] => getTocPhaseIdByVersionId error: ${formatUnknownError(error)}`,
      );
    }
  }

  private async getTocPhaseIdForReportingYear(
    reportingYear: number,
  ): Promise<string> {
    const query = `
      SELECT toc_pahse_id
      FROM ${env.DB_NAME}.version
      WHERE is_active = 1 AND status = 1 AND app_module_id = 1
        AND phase_year = ?
      LIMIT 1
    `;
    try {
      const rows = await this.dataSource.query(query, [reportingYear]);
      const phaseId = rows?.[0]?.toc_pahse_id;
      if (typeof phaseId !== 'string' || !phaseId.trim()) {
        throwServiceError(
          `No TOC phase is configured for reporting year ${reportingYear}.`,
          HttpStatus.NOT_FOUND,
        );
      }
      return phaseId.trim();
    } catch (error) {
      if (error?.status) {
        throw error;
      }
      throw new Error(
        `[${TocResultsRepository.name}] => getTocPhaseIdForReportingYear error: ${formatUnknownError(error)}`,
      );
    }
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
      throw new Error(
        `[${TocResultsRepository.name}] => getCurrentTocPhaseId error: ${formatUnknownError(error)}`,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => deleteAllData error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getAllTocResults error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      ${tocLevel === 3 ? `` : `and ibs.stageId = 4`}
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocIdFromOst error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocIdFromOst error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async inactiveTocResult() {
    const queryData = 'UPDATE toc_result set is_active = 0;';
    try {
      const tocResult: TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => inactiveTocResult error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => inactiveTocResult error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocIdFromOst error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocIdFromOst error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocIdFromOst by initiative error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getAllTocResults error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getAllTocResults error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async $_initiativeValidation(init_id: number) {
    const initiative = await this.dataSource
      .getRepository(ClarisaInitiative)
      .findOne({
        where: {
          id: init_id,
        },
      });

    if (!initiative) {
      return false;
    }

    if (initiative?.official_code === 'SGP-02') {
      return true;
    }

    return false;
  }

  private _resolveTocCategory(toc_level: number): string {
    const categoryMap: Record<number, string> = {
      1: 'OUTPUT',
      2: 'OUTCOME',
      3: 'EOI',
    };
    const category = categoryMap[toc_level];
    if (!category) {
      throwServiceError(
        `Invalid toc level: ${toc_level}. Valid levels are 1 (OUTPUT), 2 (OUTCOME), 3 (EOI)`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return category;
  }

  private async _resolveTocPhaseIdForConfigV2(
    reportingYear: number,
    explicitTocPhaseId: string | number | undefined,
    isInitiativeValidation: boolean,
  ): Promise<string | null> {
    if (isInitiativeValidation) {
      const globalParameter = await this.dataSource
        .getRepository(GlobalParameter)
        .findOne({
          where: { name: 'sgp_02_toc_version' },
        });
      return globalParameter?.value ?? null;
    }

    if (
      explicitTocPhaseId !== null &&
      explicitTocPhaseId !== undefined &&
      String(explicitTocPhaseId).trim() !== ''
    ) {
      return String(explicitTocPhaseId).trim();
    }

    return this.getTocPhaseIdForReportingYear(reportingYear);
  }

  private _buildTocConfigV2PhaseClause(
    tocPhaseId: string | null,
    isInitiativeValidation: boolean,
  ): { whereTocPhaseId: string; workPackageJoin: string } {
    const defaultWorkPackageJoin = `
      LEFT JOIN ${env.DB_TOC}.toc_work_packages wp 
        ON wp.toc_id = tr.wp_id
    `;

    if (!tocPhaseId) {
      return { whereTocPhaseId: '', workPackageJoin: defaultWorkPackageJoin };
    }

    if (isInitiativeValidation) {
      return {
        whereTocPhaseId: `AND tr.version_id = ?`,
        workPackageJoin: defaultWorkPackageJoin,
      };
    }

    return {
      whereTocPhaseId: `AND tr.phase = ?`,
      workPackageJoin: `
      LEFT JOIN ${env.DB_TOC}.toc_work_packages wp 
        ON wp.toc_id = tr.wp_id
          AND wp.year = ?
    `,
    };
  }

  private _buildPlannedResultTypeIndicatorExistsFilter(
    resultTypeId: number,
    resultId: number | undefined,
    params: (string | number)[],
  ): string {
    const currentTypePatterns = RESULT_TYPE_TO_INDICATOR_PATTERN[resultTypeId];
    const otherTypesPatterns = getOtherTypesIndicatorPatterns(resultTypeId);
    const currentLikeConditions = currentTypePatterns
      .map(() => 'tri.type_value LIKE ?')
      .join(' OR ');
    const currentTypeExists = `
        EXISTS (
          SELECT 1
          FROM ${env.DB_TOC}.toc_results_indicators tri
          WHERE tri.toc_results_id = tr.id
            AND tri.is_active = 1
            AND (${currentLikeConditions})
        )
      `;

    let otherTypesCondition = '';
    if (otherTypesPatterns.length > 0) {
      const otherLikeConditions = otherTypesPatterns
        .map(() => 'tri_other.type_value LIKE ?')
        .join(' OR ');
      otherTypesCondition = `
          OR NOT EXISTS (
            SELECT 1
            FROM ${env.DB_TOC}.toc_results_indicators tri_other
            WHERE tri_other.toc_results_id = tr.id
              AND tri_other.is_active = 1
              AND (${otherLikeConditions})
          )
        `;
    }

    const hasMappedResult =
      resultId != null && Number.isFinite(resultId) && resultId > 0;

    if (hasMappedResult) {
      params.push(...currentTypePatterns, ...otherTypesPatterns, resultId);
      return `
          AND (
            (${currentTypeExists} ${otherTypesCondition})
            OR EXISTS (
              SELECT 1
              FROM ${env.DB_NAME}.results_toc_result rtr
              WHERE rtr.toc_result_id = tr.id
                AND rtr.results_id = ?
                AND rtr.is_active = 1
            )
          )
        `;
    }

    params.push(...currentTypePatterns, ...otherTypesPatterns);
    return `
          AND (${currentTypeExists} ${otherTypesCondition})
        `;
  }

  private _buildPlannedIndicatorFilter(
    isPlanned: boolean,
    resultTypeId: number | undefined,
    resultId: number | undefined,
    params: (string | number)[],
    bilateral?: boolean,
  ): string {
    if (
      bilateral ||
      !isPlanned ||
      !resultTypeId ||
      !RESULT_TYPE_TO_INDICATOR_PATTERN[resultTypeId]?.length
    ) {
      return '';
    }

    return this._buildPlannedResultTypeIndicatorExistsFilter(
      resultTypeId,
      resultId,
      params,
    );
  }

  async $_getResultTocByConfigV2(
    init_id: number,
    toc_level: number,
    reportingYear: number,
    resultTypeId?: number,
    resultId?: number,
    planned?: boolean | string,
    explicitTocPhaseId?: string | number,
    bilateral?: boolean,
  ) {
    const isPlanned = planned === true || planned === 'true';
    const category = this._resolveTocCategory(toc_level);
    const isInitiativeValidation = await this.$_initiativeValidation(init_id);
    const tocPhaseId = await this._resolveTocPhaseIdForConfigV2(
      reportingYear,
      explicitTocPhaseId,
      isInitiativeValidation,
    );

    const params: (string | number)[] = isInitiativeValidation
      ? [init_id, category]
      : [reportingYear, init_id, category];

    const { whereTocPhaseId, workPackageJoin } =
      this._buildTocConfigV2PhaseClause(tocPhaseId, isInitiativeValidation);

    if (tocPhaseId) {
      params.push(tocPhaseId);
    }

    const indicatorFilter = this._buildPlannedIndicatorFilter(
      isPlanned,
      resultTypeId,
      resultId,
      params,
      bilateral,
    );

    const queryData = `
      SELECT DISTINCT
        tr.id AS toc_result_id,
        tr.toc_result_id AS toc_internal_id,
        tr.related_node_id,
        tr.result_title AS title,
        tr.result_description AS description,
        tr.result_type AS toc_type_id,
        tr.result_type AS toc_level_id,
        ci.id AS inititiative_id,
        tr.wp_id AS work_package_id,
        wp.acronym AS wp_short_name,
        NULL AS action_area_outcome_id
      FROM ${env.DB_TOC}.toc_results tr
      ${workPackageJoin}
      LEFT JOIN clarisa_initiatives ci 
        ON ci.official_code = tr.official_code
      WHERE tr.is_active > 0
        AND ci.id = ?
        AND tr.category = ?
        ${whereTocPhaseId}
        ${indicatorFilter}
      ORDER BY wp.acronym, tr.result_title ASC;
    `;

    try {
      const res = await this.query(queryData, params);
      return res;
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => _getResultTocByConfigV2 error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private _normalizeLinkedIndicatorNodeIds(
    linkedIndicatorNodeIds?: string[],
  ): string[] {
    return (linkedIndicatorNodeIds ?? [])
      .map((value) => `${value}`.trim())
      .filter((value) => value !== '');
  }

  private _tripleLinkedIndicatorParams(
    normalizedLinkedIndicators: string[],
  ): string[] {
    return [
      ...normalizedLinkedIndicators,
      ...normalizedLinkedIndicators,
      ...normalizedLinkedIndicators,
    ];
  }

  private async _isUnplannedTocResult(
    resultId?: number,
    initId?: number,
  ): Promise<boolean> {
    if (!resultId || !initId || !Number.isFinite(resultId) || resultId <= 0) {
      return false;
    }

    try {
      const firstResultToc = await this.query(
        `
          SELECT planned_result
          FROM ${env.DB_NAME}.results_toc_result
          WHERE results_id = ?
            AND initiative_id = ?
            AND is_active = 1
          ORDER BY created_date ASC
          LIMIT 1
        `,
        [resultId, initId],
      );
      return (
        firstResultToc?.length > 0 && firstResultToc[0]?.planned_result === 0
      );
    } catch (error) {
      this.logger.warn(
        `Error checking planned_result for result ${resultId} in getTocIndicatorsByResultIds: ${formatUnknownError(error)}`,
      );
      return false;
    }
  }

  private _appendResultTypeIndicatorFilter(
    indicatorConditions: string[],
    queryParams: unknown[],
    resultTypeId: number | undefined,
    isUnplanned: boolean,
    bilateral?: boolean,
  ): void {
    if (
      bilateral ||
      isUnplanned ||
      !resultTypeId ||
      !RESULT_TYPE_TO_INDICATOR_PATTERN[resultTypeId]?.length
    ) {
      return;
    }

    const currentTypePatterns = RESULT_TYPE_TO_INDICATOR_PATTERN[resultTypeId];
    const otherTypesPatterns = getOtherTypesIndicatorPatterns(resultTypeId);
    const currentLikeConditions = currentTypePatterns
      .map(() => 'tri.type_value LIKE ?')
      .join(' OR ');

    indicatorConditions.push(`(${currentLikeConditions})`);
    queryParams.push(...currentTypePatterns);

    if (otherTypesPatterns.length === 0) {
      return;
    }

    const otherNotLikeConditions = otherTypesPatterns
      .map(() => 'tri.type_value NOT LIKE ?')
      .join(' AND ');
    indicatorConditions.push(
      `((${otherNotLikeConditions}) OR (tri.type_value IS NULL OR tri.type_value = ''))`,
    );
    queryParams.push(...otherTypesPatterns);
  }

  private _appendLinkedIndicatorFilter(
    indicatorConditions: string[],
    queryParams: unknown[],
    normalizedLinkedIndicators: string[],
  ): void {
    if (!normalizedLinkedIndicators.length) {
      return;
    }

    const linkedPlaceholders = normalizedLinkedIndicators
      .map(() => '?')
      .join(', ');
    indicatorConditions.push(`(
        tri.related_node_id IN (${linkedPlaceholders})
        OR tri.toc_result_indicator_id IN (${linkedPlaceholders})
        OR CAST(tri.id AS CHAR) IN (${linkedPlaceholders})
      )`);
    queryParams.push(
      ...this._tripleLinkedIndicatorParams(normalizedLinkedIndicators),
    );
  }

  private _buildIndicatorVisibilityClause(
    includeInactiveIndicators: boolean,
    normalizedLinkedIndicators: string[],
  ): { clause: string; params: string[] } {
    if (includeInactiveIndicators) {
      return { clause: '', params: [] };
    }

    if (!normalizedLinkedIndicators.length) {
      return { clause: 'AND tri.is_active = 1', params: [] };
    }

    const linkedPlaceholders = normalizedLinkedIndicators
      .map(() => '?')
      .join(', ');
    return {
      clause: `AND (
        tri.is_active = 1
        OR tri.related_node_id IN (${linkedPlaceholders})
        OR tri.toc_result_indicator_id IN (${linkedPlaceholders})
        OR CAST(tri.id AS CHAR) IN (${linkedPlaceholders})
      )`,
      params: this._tripleLinkedIndicatorParams(normalizedLinkedIndicators),
    };
  }

  async getTocIndicatorsByResultIds(
    params: GetTocIndicatorsByResultIdsParams,
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
    const {
      targetYear,
      tocResultIds,
      resultTypeId,
      linkedIndicatorNodeIds,
      resultId,
      initId,
      includeInactiveIndicators = false,
      bilateral,
    } = params;

    const numericIds = (tocResultIds ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id));

    if (!numericIds.length) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(', ');
    const indicatorTargetYear = Number(targetYear);
    const queryParams: unknown[] = [indicatorTargetYear, ...numericIds];
    const isUnplanned = await this._isUnplannedTocResult(resultId, initId);
    const indicatorConditions: string[] = [];

    this._appendResultTypeIndicatorFilter(
      indicatorConditions,
      queryParams,
      resultTypeId,
      isUnplanned,
      bilateral,
    );

    const normalizedLinkedIndicators = this._normalizeLinkedIndicatorNodeIds(
      linkedIndicatorNodeIds,
    );
    this._appendLinkedIndicatorFilter(
      indicatorConditions,
      queryParams,
      normalizedLinkedIndicators,
    );

    const typeFilter = indicatorConditions.length
      ? `AND (${indicatorConditions.join(' OR ')})`
      : '';
    const { clause: visibilityFilter, params: visibilityParams } =
      this._buildIndicatorVisibilityClause(
        includeInactiveIndicators,
        normalizedLinkedIndicators,
      );

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
      LEFT JOIN ${env.DB_TOC}.toc_result_indicator_target trit
        ON tri.id = trit.id_indicator
        AND CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
        AND trit.target_date = ?
      WHERE
        tri.toc_results_id IN (${placeholders})
        ${visibilityFilter}
        ${typeFilter};
    `;

    try {
      return await this.query(query, [...queryParams, ...visibilityParams]);
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocIndicatorsByResultIds error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      .map(Number)
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

    const params = [resultId, initiativeId, ...numericIds];

    this.logger.debug(
      `[getResultIndicatorMappings] Running query for result ${resultId} / initiative ${initiativeId} and tocResultIds=[${numericIds.join(', ')}]`,
    );

    try {
      const rows = await this.query(query, params);
      if (!rows.length) {
        this.logger.debug(
          `[getResultIndicatorMappings] Query returned 0 rows. Params => ${JSON.stringify(
            params,
          )}`,
        );
      }
      return rows;
    } catch (error) {
      this.logger.error(
        `[getResultIndicatorMappings] Failed query with params ${JSON.stringify(
          params,
        )}`,
      );
      throwServiceError(
        `[${TocResultsRepository.name}] => getResultIndicatorMappings error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      throwServiceError(
        `Invalid toc level: ${tocLevel}. Valid levels are 1 (OUTPUT), 2 (OUTCOME), 3 (EOI)`,
        HttpStatus.BAD_REQUEST,
      );
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
      throwServiceError(
        `[${TocResultsRepository.name}] => getAllTocResultsByInitiativeV2 error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Returns catalog targets from DB_TOC for the given indicator node ids and reporting year.
   * Aligns with AoWBilateralRepository.buildTocQuery target resolution.
   */
  async getCatalogTargetsByIndicatorNodeIds(
    indicatorNodeIds: string[],
    reportingYear: number,
  ): Promise<
    Array<{
      toc_result_indicator_id: string;
      toc_indicator_target_id: number;
      target_date: number;
      target_value: number | null;
      number_target: string | null;
    }>
  > {
    const normalizedIds = (indicatorNodeIds ?? [])
      .map((id) => `${id}`.trim())
      .filter((id) => id !== '');

    if (!normalizedIds.length || !Number.isFinite(reportingYear)) {
      return [];
    }

    const placeholders = normalizedIds.map(() => '?').join(', ');
    const query = `
      SELECT
        trit.toc_result_indicator_id,
        trit.toc_indicator_target_id,
        trit.target_date,
        trit.target_value,
        trit.number_target
      FROM ${env.DB_TOC}.toc_result_indicator_target trit
      WHERE trit.toc_result_indicator_id IN (${placeholders})
        AND trit.target_date = ?
      ORDER BY trit.number_target ASC
    `;

    try {
      return await this.query(query, [...normalizedIds, reportingYear]);
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => getCatalogTargetsByIndicatorNodeIds error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTocPartnersByResultIds(
    tocResultIds: Array<number | string>,
    tocPhaseId: string,
  ): Promise<Array<{ toc_result_id: number; code: number | string }>> {
    const numericIds = (tocResultIds ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);

    const normalizedPhaseId = `${tocPhaseId ?? ''}`.trim();
    if (!numericIds.length || !normalizedPhaseId) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(', ');
    const query = `
      SELECT DISTINCT
        tr.id AS toc_result_id,
        trp.code
      FROM ${env.DB_TOC}.toc_results tr
      INNER JOIN ${env.DB_TOC}.toc_result_partners trp
        ON trp.toc_result_id_toc = tr.related_node_id
      WHERE tr.id IN (${placeholders})
        AND tr.phase = ?
    `;

    try {
      return await this.query(query, [...numericIds, normalizedPhaseId]);
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocPartnersByResultIds error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTocSynergyProgramsByResultIds(
    tocResultIds: Array<number | string>,
    tocPhaseId: string,
  ): Promise<Array<{ toc_result_id: number; initiative_id: number }>> {
    const numericIds = (tocResultIds ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);

    const normalizedPhaseId = `${tocPhaseId ?? ''}`.trim();
    if (!numericIds.length || !normalizedPhaseId) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(', ');
    const query = `
      SELECT DISTINCT
        tr.id AS toc_result_id,
        ci.id AS initiative_id
      FROM ${env.DB_TOC}.toc_results tr
      INNER JOIN ${env.DB_TOC}.toc_result_synergy_programs trsp
        ON trsp.toc_results_id = tr.id
      INNER JOIN clarisa_initiatives ci
        ON ci.official_code = trsp.initiative_id
      WHERE tr.id IN (${placeholders})
        AND trsp.phase = ?
    `;

    try {
      return await this.query(query, [...numericIds, normalizedPhaseId]);
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocSynergyProgramsByResultIds error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTocTargetCentersByResultIds(
    tocResultIds: Array<number | string>,
    tocPhaseId: string,
    reportingYear: number,
  ): Promise<
    Array<{
      toc_result_id: number;
      indicator_id: number;
      center_id: number;
    }>
  > {
    const numericIds = (tocResultIds ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);

    const normalizedPhaseId = `${tocPhaseId ?? ''}`.trim();
    const targetYear = Number(reportingYear);

    if (
      !numericIds.length ||
      !normalizedPhaseId ||
      !Number.isFinite(targetYear)
    ) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(', ');
    const query = `
      SELECT DISTINCT
        tr.id AS toc_result_id,
        tri.id AS indicator_id,
        tritc.center_id
      FROM ${env.DB_TOC}.toc_results tr
      INNER JOIN ${env.DB_TOC}.toc_results_indicators tri
        ON tri.toc_results_id = tr.id
        AND tri.is_active = 1
      INNER JOIN ${env.DB_TOC}.toc_result_indicator_target trit
        ON trit.id_indicator = tri.id
        AND trit.target_date = ?
      INNER JOIN ${env.DB_TOC}.toc_result_indicator_target_center tritc
        ON tritc.toc_indicator_target_id = trit.toc_indicator_target_id
      WHERE tr.id IN (${placeholders})
        AND tr.phase = ?
        AND tritc.center_id IS NOT NULL
    `;

    try {
      return await this.query(query, [
        targetYear,
        ...numericIds,
        normalizedPhaseId,
      ]);
    } catch (error) {
      throwServiceError(
        `[${TocResultsRepository.name}] => getTocTargetCentersByResultIds error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
