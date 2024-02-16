import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'process';
import { HandlersError } from 'src/shared/handlers/error.utils';
@Injectable()
export class TypeOneReportRepository {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {}
  async getFactSheetByInit(initId: number) {
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
        DISTINCT crc.name,
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
        AND r.status_id = 3
        AND rbi.initiative_role_id = 1
    ORDER BY
        cc3.name ASC;
    `;
    const regionsReportedQuery = `
    SELECT
      GROUP_CONCAT(DISTINCT crc.cgiar_name SEPARATOR '; ') AS regions,
      rbi.inititiative_id AS initiative_id
    FROM result r
      LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
      LEFT JOIN result_region rr ON rr.result_id = r.id
      LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
      LEFT JOIN clarisa_regions_cgiar crc ON crc.un_code = cr.um49Code
    WHERE rbi.inititiative_id = ?
      AND r.status_id = 3
      AND r.is_active = 1 
      AND cr.parent_regions_code IS NOT NULL
      AND rr.is_active = 1
    ORDER BY crc.cgiar_name ASC;
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
      AND re.result_description IS NOT NULL
    ORDER BY
      re.result_title ASC;
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
      const ginfo: any[] = await this.dataSource.query(
        initiativeGeneralInformationQuery,
        [initId],
      );
      const istage = ginfo[0].initiative_stage_id;

      const generalInformation = [];

      const initiative_id = ginfo[0].initiative_id;
      const initiative_stage_id = ginfo[0].initiative_stage_id;
      const official_code = ginfo[0].official_code;
      const initiative_name = ginfo[0].initiative_name;
      const short_name = ginfo[0].short_name;
      const action_area = ginfo[0].action_area;
      const start_date = new Date(ginfo[0].start_date).toLocaleDateString(
        'en-GB',
      );
      const end_date = new Date(ginfo[0].end_date).toLocaleDateString('en-GB');
      const web_page = ginfo[0].web_page;
      const iniative_lead = ginfo[0].iniative_lead;
      const initiative_deputy = ginfo[0].initiative_deputy;

      generalInformation.push({
        initiative_id,
        initiative_stage_id,
        official_code,
        initiative_name,
        short_name,
        action_area,
        start_date,
        end_date,
        web_page,
        iniative_lead,
        initiative_deputy,
      });

      const countriesProposal: any[] = await this.dataSource.query(
        countriesProposalQuery,
        [istage],
      );
      const regionsProposal: any[] = await this.dataSource.query(
        regionsProposalQuery,
        [istage],
      );
      const countrieReported: any[] = await this.dataSource.query(
        countrieReportedQuery,
        [initId],
      );
      const regionsReported: any[] = await this.dataSource.query(
        regionsReportedQuery,
        [initId],
      );
      const eoiOutcome: any[] = await this.dataSource.query(eoiOutcomeQuery, [
        istage,
      ]);
      const budgetProposal: any[] = await this.dataSource.query(
        budgetProposalQuery,
        [initId],
      );
      const budgetAnaPlan: any[] = await this.dataSource.query(
        budgetAnaPlanQuery,
        [initId],
      );
      const climateGenderScore: any[] = await this.dataSource.query(
        climateGenderScoreQuery,
        [initId],
      );
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
  async getKeyResultStory(initId: number, phase?: number) {
    const queryKeyResultStory = `
    SELECT
        r.result_code,
        concat('Result Code: ', r.result_code, '-', r.title) as 'result_title',
        IF((r.result_type_id = 9), 1, 0) AS is_impact,
        CONCAT(ci.official_code, ' ', ci.name) as 'primary_submitter',
        (
            SELECT
                GROUP_CONCAT(
                    DISTINCT concat(ci2.official_code, ' ', ci2.short_name) separator '; '
                )
            FROM
                result r2
                left join results_by_inititiative rbi2 on rbi2.result_id = r2.id
                and rbi2.initiative_role_id = 2
                and rbi2.is_active > 0
                left join clarisa_initiatives ci2 on ci2.id = rbi2.inititiative_id
            WHERE
                r2.id = r.id
        ) as "contributing_initiative",
        (
            SELECT
                GROUP_CONCAT(
                    distinct CONCAT(
                        if(rc.is_primary, '(Primary: ', '('),
                        ci5.acronym,
                        ' - ',
                        ci5.name,
                        ')'
                    ) SEPARATOR '<br>'
                )
            FROM
                result r2
                left join results_center rc on rc.result_id = r2.id
                and rc.is_active > 0
                left join clarisa_center cc2 on cc2.code = rc.center_id
                left join clarisa_institutions ci5 on ci5.id = cc2.institutionId
            WHERE
                r2.id = r.id
                AND r2.status = 1
        ) as "contributing_center",
        (
            SELECT
                GROUP_CONCAT(DISTINCT ci7.name, ' ', '(', ci7.acronym, ')' SEPARATOR '<br>')
            FROM
                results_by_institution rbi
                left join result_by_institutions_by_deliveries_type rbibdt on rbibdt.result_by_institution_id = rbi.id
                and rbibdt.is_active > 0
                left join clarisa_institutions ci7 on ci7.id = rbi.institutions_id
                left JOIN partner_delivery_type pdt on pdt.id = rbibdt.partner_delivery_type_id
            WHERE
                rbi.result_id = r.id
                and rbi.institution_roles_id = 2
                and rbi.is_active > 0
            GROUP by
                rbi.result_id
        ) as "contribution_external_partner",
        (
            SELECT
                GROUP_CONCAT(DISTINCT crc.cgiar_name separator '; ')
            FROM
                result_region rr
                left join clarisa_regions cr on cr.um49Code = rr.region_id
                LEFT JOIN clarisa_regions_cgiar crc ON crc.un_code = cr.um49Code
            WHERE
                rr.result_id = r.id
                and rr.is_active = 1
        ) as "regions",
        (
            SELECT
                GROUP_CONCAT(DISTINCT cc3.name separator '; ')
            FROM
                result_country rc2
                left join clarisa_countries cc3 on cc3.id = rc2.country_id
            WHERE
                rc2.result_id = r.id
                and rc2.is_active = 1
        ) as "countries",
        (
            SELECT
                GROUP_CONCAT(DISTINCT lr.detail_link separator '; ')
            FROM
                result r7
                left join legacy_result lr ON lr.legacy_id = r7.legacy_id
            WHERE
                r7.id = r.id
                and r7.legacy_id is not null
        ) as "web_legacy",
        concat('[',
        (
        	SELECT 
        		GROUP_CONCAT(DISTINCT concat('{"id_impactArea":', cia.id, ',\n"nameImpact":"', cia.name,'"}') separator ',\n')
            from
                ${env.DB_OST}.toc_results_impact_area_results triar
                join ${
                  env.DB_OST
                }.toc_impact_area_results tiar on tiar.toc_result_id = triar.impact_area_toc_result_id
                join ${
                  env.DB_OST
                }.clarisa_impact_areas cia on cia.id = tiar.impact_area_id
            WHERE
                triar.toc_result_id in (
                    SELECT
                        tr.toc_internal_id
                    from
                        result r8
                        join results_toc_result rtr on rtr.results_id = r8.id
                        join toc_result tr on tr.toc_result_id = rtr.toc_result_id
                    WHERE
                        r8.id = r.id
                )
        ),']') as 'impact_areas',
        (
            SELECT
                GROUP_CONCAT(DISTINCT cgt.target separator '<br>')
            from
                ${env.DB_OST}.toc_results_impact_area_results triar
                join ${
                  env.DB_OST
                }.toc_impact_area_results tiar on tiar.toc_result_id = triar.impact_area_toc_result_id
                join ${
                  env.DB_OST
                }.toc_impact_area_results_global_targets tiargt on tiargt.impact_area_toc_result_id = tiar.toc_result_id
                join ${
                  env.DB_OST
                }.clarisa_global_targets cgt on cgt.id = tiargt.global_target_id
            WHERE
                triar.toc_result_id in (
                    SELECT
                        tr.toc_internal_id
                    from
                        result r8
                        join results_toc_result rtr on rtr.results_id = r8.id
                        join toc_result tr on tr.toc_result_id = rtr.toc_result_id
                    WHERE
                        r8.id = r.id
                )
        ) as 'global_targets',
        (
        	SELECT 
        		 pia.impact_area_id 
            from
               primary_impact_area pia 
               join clarisa_impact_areas cia ON cia.id = pia.impact_area_id 
               WHERE pia.result_code = r.result_code 
                
        )as 'impact_area_id',
        (
        	SELECT 
        		GROUP_CONCAT(DISTINCT cia.name separator '<br>')
            from
                ${env.DB_OST}.toc_results_impact_area_results triar
                join ${
                  env.DB_OST
                }.toc_impact_area_results tiar on tiar.toc_result_id = triar.impact_area_toc_result_id
                join ${
                  env.DB_OST
                }.clarisa_impact_areas cia on cia.id = tiar.impact_area_id
            WHERE
                triar.toc_result_id in (
                    SELECT
                        tr.toc_internal_id
                    from
                        result r8
                        join results_toc_result rtr on rtr.results_id = r8.id
                        join toc_result tr on tr.toc_result_id = rtr.toc_result_id
                    WHERE
                        r8.id = r.id
                )
               and cia.id <> if((SELECT 
        		 pia.impact_area_id
            from
               primary_impact_area pia 
               join clarisa_impact_areas cia ON cia.id = pia.impact_area_id 
               WHERE pia.result_code = r.result_code) is null, 0, (SELECT 
        		 pia.impact_area_id
            from
               primary_impact_area pia 
               join clarisa_impact_areas cia ON cia.id = pia.impact_area_id 
               WHERE pia.result_code = r.result_code))
        ) as 'other_impact_areas'
    from
        result r
        join results_by_inititiative rbi on rbi.result_id = r.id
        and rbi.initiative_role_id = 1
        and rbi.is_active > 0
        join clarisa_initiatives ci on rbi.inititiative_id = ci.id
        left join result_type rt on rt.id = r.result_type_id
    WHERE
        r.is_krs = 1
        and r.is_active = 1
        and r.status_id = 3
        and rbi.initiative_role_id = 1 
        and ci.id = ?
        ${phase ? `and r.version_id = ${phase}` : ''}
        ;
    `;
    try {
      const generalInformation: any[] = await this.dataSource.query(
        queryKeyResultStory,
        [initId],
      );
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
