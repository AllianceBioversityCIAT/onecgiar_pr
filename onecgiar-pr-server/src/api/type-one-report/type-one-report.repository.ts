import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { env } from 'process';
import { TypeOneReport } from './entities/type-one-report.entity';
import { HandlersError } from 'src/shared/handlers/error.utils';
@Injectable()
export class TypeOneReportRepository {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) { }
  async getFactSheetByInit(
    initId: number
  ) {
    const initiativeGeneralInformationQuery = `
    SELECT
      i.id AS initiative_id,
      ibs.id AS initiative_stage_id,
      i.official_code,
      i.name AS initiative_name,
      i.acronym AS short_name,
      caa.name AS action_area,
      i.start_date,
      i.end_date,
      i.web_page,
      (
        SELECT
          CONCAT(
            u.first_name,
            SPACE(1),
            u.last_name,
            ' - ',
            u.email
          )
        FROM
          ${env.DB_OST}.initiatives_by_users ibu
          LEFT JOIN ${env.DB_OST}.users u ON u.id = ibu.userId
          LEFT JOIN ${env.DB_OST}.roles r ON r.id = ibu.roleId
        WHERE
          ibu.roleId IN(2, 3)
          AND ibu.active = 1
          AND ibu.initiativeId = i.id
          AND r.id = 2
        ORDER BY
          ibu.initiativeId
      ) AS iniative_lead,
      (
        SELECT
          CONCAT(
            u.first_name,
            SPACE(1),
            u.last_name,
            ' - ',
            u.email
          )
        FROM
        ${env.DB_OST}.initiatives_by_users ibu
          LEFT JOIN ${env.DB_OST}.users u ON u.id = ibu.userId
          LEFT JOIN ${env.DB_OST}.roles r ON r.id = ibu.roleId
        WHERE
          ibu.roleId IN(2, 3)
          AND ibu.active = 1
          AND ibu.initiativeId = i.id
          AND r.id = 3
        ORDER BY
          ibu.initiativeId
      ) AS initiative_deputy
    FROM
    ${env.DB_OST}.initiatives i
      LEFT JOIN ${env.DB_OST}.initiatives_by_stages ibs ON ibs.initiativeId = i.id
      LEFT JOIN ${env.DB_OST}.general_information gi ON gi.initvStgId = ibs.id
      LEFT JOIN ${env.DB_OST}.clarisa_action_areas caa ON caa.id = gi.action_area_id
    WHERE
      ibs.active = 1
      AND i.id = ?
    ORDER BY
      i.official_code ASC;
    `;
    const countriesProposalQuery = `
    SELECT
        DISTINCT cc.name,
        co.initvStgId
    FROM
        ${env.DB_OST}.countries_by_initiative_by_stage co
        LEFT JOIN ${env.DB_OST}.clarisa_countries cc ON cc.code = co.country_id
    WHERE
        co.initvStgId = ?
        AND co.active = 1
        AND co.wrkPkgId IS NOT NULL
    ORDER BY
      cc.name ASC
    LIMIT 
      15000;
    `;
    const regionsProposalQuery = `
    SELECT
        IFNULL(GROUP_CONCAT(DISTINCT crc.name SEPARATOR '; '), 'There are not Regions data') AS name,
        r.initvStgId
    FROM
      ${env.DB_OST}.regions_by_initiative_by_stage r
        LEFT JOIN ${env.DB_OST}.clarisa_regions_cgiar crc ON crc.id = r.region_id
    WHERE
        r.initvStgId = ?
        AND r.active = 1
        AND r.wrkPkgId IS NOT NULL
    ORDER BY
      crc.name ASC;
    `;
    const countrieReportedQuery = `
    SELECT
        IFNULL(GROUP_CONCAT(DISTINCT cc3.name SEPARATOR '; '), 'There are not Countries data') AS countries,
        rbi.inititiative_id AS initiative_id
    FROM
        result_country rc2
        LEFT JOIN clarisa_countries cc3 ON cc3.id = rc2.country_id
        LEFT JOIN result r ON r.id = rc2.result_id
        LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
    WHERE
        rbi.inititiative_id = ?
        AND rc2.is_active = 1
        AND r.is_active = 1
        AND r.status = 1
    ORDER BY
        cc3.name ASC;
    `;
    const regionsReportedQuery = `
    SELECT
        IFNULL(GROUP_CONCAT(DISTINCT cr.name SEPARATOR '; '), 'There are not Regions data') AS regions,
        rbi.inititiative_id AS initiative_id
    FROM
        result_region rr
        LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
        LEFT JOIN result r ON r.id = rr.result_id
        LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
    WHERE
        rbi.inititiative_id = ?
        AND rr.is_active = 1
    ORDER BY
      cr.name ASC;
    `;
    const eoiOutcomeQuery = `
    SELECT
      re.initvStgId,
      re.id,
      rt.name as type_name,
      re.result_type_id as result_type,
      re.result_title,
      re.result_description,
      re.is_global,
      re.active
    FROM
      ${env.DB_OST}.results re
      left join ${env.DB_OST}.results_types rt on rt.id = re.result_type_id
    WHERE
      re.initvStgId = ?
      AND re.active = 1
      AND re.result_type_id = 3
    ORDER BY
      re.result_type_id;
    `;
    const budgetProposalQuery = `
    SELECT
        fry.year,
        SUM(fry.value) AS total,
        i.id AS initiative_id
    FROM
        ${env.DB_OST}.financial_resources_years fry
        LEFT JOIN  ${env.DB_OST}.financial_resources fr ON fr.id = fry.financialResourcesId
        LEFT JOIN  ${env.DB_OST}.initiatives_by_stages ibs ON ibs.id = fr.initvStgId
        LEFT JOIN  ${env.DB_OST}.initiatives i ON i.id = ibs.initiativeId
    WHERE
        i.id = ?
        AND fry.active = 1
        AND fr.financial_type = 'activity_breakdown'
        AND ibs.stageId = 3
    GROUP BY
        fry.year;
    `;
    const budgetAnaPlanQuery = `
    SELECT
        fry.year,
        SUM(fry.value) AS total
    FROM
        ${env.DB_OST}.financial_resources_years fry
        LEFT JOIN ${env.DB_OST}.financial_resources fr ON fr.id = fry.financialResourcesId
        LEFT JOIN ${env.DB_OST}.initiatives_by_stages ibs ON ibs.id = fr.initvStgId
        LEFT JOIN ${env.DB_OST}.initiatives i ON i.id = ibs.initiativeId
    WHERE
        i.id = ?
        AND fry.active = 1
        AND fr.financial_type = 'activity_breakdown'
        AND ibs.stageId = 4
    GROUP BY
        fry.year;
    `;
    const climateGenderScoreQuery = `
    SELECT
        DISTINCT a.ID,
        i.id AS initiative_id,
        CONCAT(
            'Score ',
            a.Adaptation_Score
        ) as adaptation_score,
        (
            SELECT
                climate_score_def
            FROM
              ${env.DB_OST}.climate_score_cl csc
            WHERE
                csc.id_climate_score_cl = a.Adaptation_Score
        ) AS adaptation_desc,
        CONCAT(
            'Score ',
            a.Mitigation_Score
        ) as mitigation_score,
        (
            SELECT
                csc.climate_score_def
            FROM
              ${env.DB_OST}.climate_score_cl csc
            WHERE
                csc.id_climate_score_cl = a.Mitigation_Score
        ) AS mitigation_desc,
        a.Gender_Score AS gender_score,
        gsc.gender_score_def AS gender_desc
    FROM
        ${env.DB_OST}.aecd a
        LEFT JOIN ${env.DB_OST}.initiatives i ON i.official_code = a.ID
        LEFT JOIN ${env.DB_OST}.gender_score_cl gsc ON gsc.id_gender_score_cl = a.Gender_Score
    WHERE
        i.id = ?;
    `;

    try {
      const generalInformation: any[] = await this.dataSource.query(initiativeGeneralInformationQuery, [initId]);
      const initiative_stage_id = generalInformation[0].initiative_stage_id;
      const countriesProposal: any[] = await this.dataSource.query(countriesProposalQuery, [initiative_stage_id])
      const regionsProposal: any[] = await this.dataSource.query(regionsProposalQuery, [initiative_stage_id])
      const countrieReported: any[] = await this.dataSource.query(countrieReportedQuery, [initId]);
      const regionsReported: any[] = await this.dataSource.query(regionsReportedQuery, [initId]);
      const eoiOutcome: any[] = await this.dataSource.query(eoiOutcomeQuery, [initiative_stage_id]);
      const budgetProposal: any[] = await this.dataSource.query(budgetProposalQuery, [initId]);
      const budgetAnaPlan: any[] = await this.dataSource.query(budgetAnaPlanQuery, [initId]);
      const climateGenderScore: any[] = await this.dataSource.query(climateGenderScoreQuery, [initId]);
      generalInformation.map((gi) => {
        gi['countriesProposal'] = countriesProposal.filter((cp) => {
          return cp.initvStgId === gi.initiative_stage_id;
        });
        gi['regionsProposal'] = regionsProposal.filter((rp) => {
          return rp.initvStgId === gi.initiative_stage_id;
        });
        gi['countrieReported'] = countrieReported.filter((cr) => {
          return cr.initiative_id === gi.initiative_id;
        });
        gi['regionsReported'] = regionsReported.filter((rr) => {
          return rr.initiative_id === gi.initiative_id;
        });
        gi['eoiOutcome'] = eoiOutcome.filter((eoi) => {
          return eoi.initvStgId === gi.initiative_stage_id;
        });
        gi['budgetProposal'] = budgetProposal.filter((b) => {
          return b.inititiative_id === gi.inititiative_id;
        });
        gi['budgetAnaPlan'] = budgetAnaPlan.filter((b) => {
          return b.inititiative_id === gi.inititiative_id;
        });
        gi['climateGenderScore'] = climateGenderScore.filter((cgs) => {
          return cgs.initiative_id === gi.initiative_id;
        });
      });
      return [generalInformation[0]];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: TypeOneReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }
  async getKeyResultStory(initId: number) {
    const queryKeyResultStory = `SELECT r.result_code ,
    concat('Result Code: ',r.result_code,'-',r.title) as 'result_title',
    IF((r.result_type_id = 9), 1, 0) AS is_impact,
    CONCAT(ci.official_code,' ', ci.name) as  'primary_submitter',
    (SELECT GROUP_CONCAT(DISTINCT concat(ci2.official_code, ' ', ci2.short_name) separator ', ')
      FROM result r2
      left join results_by_inititiative rbi2
      on rbi2.result_id = r2.id
      and rbi2.initiative_role_id = 2
      and rbi2.is_active > 0
      left join clarisa_initiatives ci2 on ci2.id = rbi2.inititiative_id
      WHERE r2.id = r.id
    ) as "contributing_initiative",
    (SELECT GROUP_CONCAT(DISTINCT ci4.acronym separator ', ')
      FROM result r3
      left join non_pooled_project npp on npp.results_id = r3.id
      and npp.is_active > 0
      left join clarisa_institutions ci4 on ci4.id = npp.funder_institution_id
      left join results_center rc on rc.result_id = r.id
      and rc.is_active > 0
      WHERE r3.id = r.id
    ) as "contributing_center",
    (SELECT GROUP_CONCAT(DISTINCT ci7.name SEPARATOR ', ')
      FROM results_by_institution rbi
      left join result_by_institutions_by_deliveries_type rbibdt
      on rbibdt.result_by_institution_id = rbi.id
      and rbibdt.is_active > 0
      left join clarisa_institutions ci7
      on ci7.id = rbi.institutions_id
      left JOIN partner_delivery_type pdt
      on pdt.id = rbibdt.partner_delivery_type_id
      WHERE rbi.result_id = r.id
      and rbi.institution_roles_id = 2
      and rbi.is_active > 0
      GROUP by rbi.result_id) as "contribution_external_partner",
    ( SELECT GROUP_CONCAT(DISTINCT cr.name separator ', ')
         FROM result_region rr
    left join clarisa_regions cr
           on cr.um49Code = rr.region_id
        WHERE rr.result_id = r.id
          and rr.is_active = 1) as "regions",
    (SELECT GROUP_CONCAT(DISTINCT cc3.name separator ', ')
         FROM result_country rc2
    left join clarisa_countries cc3
           on cc3.id = rc2.country_id
        WHERE rc2.result_id = r.id
          and rc2.is_active = 1) as "countries",
    (SELECT GROUP_CONCAT(DISTINCT concat (cgt.target, ciai.name)  separator ', ')
    FROM result r5
    left join results_impact_area_indicators riai 
      on r5.id = riai.result_id
    left join results_impact_area_target riat 
      ON r5.id = riat.result_id 
    left join clarisa_impact_area_indicator ciai 
      on ciai.id = riai.impact_area_indicator_id 
    left join clarisa_global_targets cgt 
      on cgt.targetId = riat.result_impact_area_target_id 
    WHERE r5.id = r.id
    ) as "other_relevant_impact_area",
    (SELECT GROUP_CONCAT(DISTINCT cgt.target  separator ', ')
    FROM result r6
    left join results_impact_area_target riat 
      ON r6.id = riat.result_id 
    left join clarisa_global_targets cgt 
      on cgt.targetId = riat.result_impact_area_target_id 
    WHERE r6.id = r.id
    ) as "global_target",
    (SELECT GROUP_CONCAT(DISTINCT lr.detail_link  separator ', ')
    FROM result r7
    left join legacy_result lr
      ON lr.legacy_id  = r7.legacy_id  
    WHERE r7.id = r.id and r7.legacy_id is not null
    ) as "web_legacy"
  from result r
  join results_by_inititiative rbi
    on rbi.result_id = r.id
    and rbi.initiative_role_id = 1
    and rbi.is_active > 0
  join clarisa_initiatives ci
    on rbi.inititiative_id = ci.id
  left join result_type rt on rt.id = r.result_type_id
    WHERE r.is_krs = 1
    and r.is_active = 1
    and r.status = 1
    and ci.id = ?`;
    try {
      const generalInformation: any[] = await this.dataSource.query(queryKeyResultStory, [initId]);
      return generalInformation;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: TypeOneReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
