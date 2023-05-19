import { MigrationInterface, QueryRunner } from 'typeorm';

export class BasicDataInfoFunctPDF1684500357181 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `drop function if exists \`reportBasicInfoByResultCode\`;`,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`reportBasicInfoByResultCode\`(p_result_code bigint, p_version_id bigint, p_pdf_url text) RETURNS json
        begin
            declare basic_data json;
        select 
            json_object(
                "result_code", q1.result_code,
                "result_level", q1.result_level,
                "rt_id", q1.rt_id,
                "rl_id", q1.rl_id,
                "result_type", q1.result_type,
                "submission_status", q1.submission_status,
                "submission_data", q1.submission_data,
                "result_name", q1.result_name,
                "result_description", q1.result_description,
                "lead_name", q1.lead_contact_person,
                "gender_tag", q1.gender_tag,
                "climate_tag", q1.climate_tag,
                "has_actor_data", q1.has_actor_data,
                "actor_data", q1.actor_data,
                "is_krs", q1.is_krs,
                "krs_link", q1.krs_link,
                "primary_submitter_name", q1.primary_submitter_name,
                "contributing_initiatives", q1.contributing_initiatives,
                "non_pooled_projects", q1.non_pooled_projects,
                "contributing_centers", q1.contributing_centers,
                -- "primary_submitter_data", q1.primary_submitter_data,
                -- "other_contributors_data", q1.other_contributors_data,
                "partners_applicable", q1.partners_applicable,
                "non_kp_partner_data", q1.non_kp_partner_data,
                "kp_partner_data", q1.kp_partner_data,
                "geo_focus", q1.geo_focus,
                "regions", q1.regions,
                "countries", q1.countries,
                "linked_results", q1.linked_results,
                "previous_portfolio", q1.previous_portfolio,
                "linked_evidences", q1.linked_evidences
            )
        into
            basic_data
        from
            (
            select
                -- section one
                r.result_code,
                rl.name as result_level,
                rt.name as result_type,
                rt.id as rt_id,
                rl.id as rl_id,
                (case
                    when r.status = 0 then "Editing"
                    when r.status = 1 then "Submitted"
                    else "Not defined"
                end) as submission_status,
                if(
                    r.status = 1,
                    (
                        select 
                            concat(
                                'Submitted on ', DATE_FORMAT(CONVERT_TZ(s_q1.created_date, '+00:00', '+02:00'), '%W, %M %D, %Y at %k:%i CET'),
                                ' by ', u_q1.first_name, ' ', u_q1.last_name
                            )
                        from submission s_q1 
                        join users u_q1 on s_q1.user_id = u_q1.id 
                        where s_q1.results_id = r.id 
                        order by s_q1.created_date desc 
                        limit 1
                    ), 
                    'Not Applicable'
                ) as submission_data,
                r.title as result_name,
                r.description as result_description,
                r.lead_contact_person ,
                gtl.title as gender_tag,
                gtl2.title as climate_tag,
                if(rl.id in (2,3), "Yes", "No") as has_actor_data,
                if(rl.id in (2,3),(
                    select
                        cast(concat('[', GROUP_CONCAT(DISTINCT json_object('partner_name', concat(if(coalesce(ci7.acronym, '') = '', '', concat(ci7.acronym, ' - ')), ci7.name), 'partner_type', cit7.name) SEPARATOR ','), ']') as json)
                    FROM
                        results_by_institution rbi
                    left join clarisa_institutions ci7 
                    on
                        ci7.id = rbi.institutions_id
                    left join clarisa_institution_types cit7 
                    on
                        cit7.code = ci7.institution_type_code
                    WHERE
                        rbi.result_id = 4248
                        and rbi.institution_roles_id = 1
                        and rbi.is_active > 0
                    GROUP by
                        rbi.result_id
                ),null) as actor_data,
                if(r.is_krs is null, '', if(r.is_krs = 1,'Yes','No')) as is_krs,
                r.krs_url as krs_link,
                -- section 2
                concat(ci.official_code, ' - ', ci.name) as primary_submitter_name,
                GROUP_CONCAT(distinct concat('"', ci2.name, ' - ', ci2.name, '"') SEPARATOR ', ') as contributing_initiatives,
                cast(concat('[', GROUP_CONCAT(distinct if(npp.id is null, null, json_object('non_pooled_name', concat(ci4.acronym, ' - ', ci4.name), 'non_pooled_grant_name', npp.grant_title, 'non_pooled_grant_id', npp.center_grant_id, 'non_pooled_center', ci3.name)) SEPARATOR ','), ']') as json) as non_pooled_projects,
                (
                    SELECT JSON_ARRAYAGG(json_obj)
                    FROM (
                        SELECT JSON_OBJECT('is_primary_center', rc.is_primary, 'center_name', concat(ci5.acronym, ' - ', ci5.name)) AS json_obj
                        FROM results_center rc 
                        left join clarisa_center cc2 on
                            cc2.code = rc.center_id
                        left join clarisa_institutions ci5 on
                            ci5.id = cc2.institutionId
                        where rc.result_id = r.id
                            and rc.is_active > 0
                    ORDER BY rc.is_primary DESC
                    ) as processed_centers
                ) as contributing_centers,
                /*json_object(
                    'contributor_name', concat(ci.official_code, ' - ', ci.short_name), 
                    'contributor_toc_level' , tl.name, 
                    'contributor_toc_result_title', tr.title
                    
                ) as primary_submitter_data,
                cast(concat('[', GROUP_CONCAT(distinct json_object('contributor_name', concat(ci6.official_code, ' - ', ci6.short_name), 'contributor_toc_level' , tl2.name, 'contributor_toc_result_title', tr2.title) SEPARATOR ','), ']') as json) as other_contributors_data,*/
                -- section 3
                if(r.no_applicable_partner is null, null, if(r.no_applicable_partner = 1, "No", "Yes")) as partners_applicable,
                if(rt.id <> 6,
                (
                    select
                        cast(
                            concat(
                                '[',
                                group_concat(
                                    distinct q1.partner separator ','
                                ),
                                ']'
                            )
                        as json)
                    from (
                        SELECT 
                            rbi.result_id,
                            json_object(
                                'partner_name', concat(if(coalesce(ci7.acronym, '') = '', '', concat(ci7.acronym, ' - ')), ci7.name), 
                                'partner_country_hq', concat(cc7.name, ' (', cc7.iso_alpha_2, ')'), 
                                'partner_type', cit7.name, 
                                'partner_delivery_type', group_concat(distinct pdt.name separator ', ')
                            ) as partner
                        FROM results_by_institution rbi 
                        left join result_by_institutions_by_deliveries_type rbibdt 
                        on rbibdt.result_by_institution_id = rbi.id
                            and rbibdt.is_active > 0
                        left join clarisa_institutions ci7 
                        on ci7.id = rbi.institutions_id
                        left join clarisa_countries cc7
                        on ci7.headquarter_country_iso2 = cc7.iso_alpha_2
                        left join clarisa_institution_types cit7 
                        on cit7.code = ci7.institution_type_code 
                        left JOIN partner_delivery_type pdt 
                        on pdt.id = rbibdt.partner_delivery_type_id
                        WHERE rbi.is_active > 0
                            and rbi.institution_roles_id = 2
                            and rbi.result_id = r.id
                        GROUP by rbi.result_id,
                            rbi.institutions_id
                    ) as q1
                    group by q1.result_id
                ),
                null) as non_kp_partner_data,
                if(rt.id = 6,
                (
                    select
                        cast(
                            concat(
                                '[',
                                group_concat(
                                    distinct q1.partner separator ','
                                ),
                                ']'
                            )
                        as json)
                    from (
                        SELECT 
                            rkp.results_id,
                            json_object(
                                'partner_cgspace_name', rkmi.intitution_name,
                                'partner_user_mapped', if(
                                    rkmi.results_by_institutions_id is null,
                                    null,
                                    json_object(
                                        'partner_name', concat(if(coalesce(ci8.acronym, '') = '', '', concat(ci8.acronym, ' - ')), ci8.name), 
                                        'partner_country_hq', concat(cc8.name, ' (', cc8.iso_alpha_2, ')'), 
                                        'partner_type', cit8.name, 
                                        'partner_delivery_type', group_concat(distinct pdt.name separator ', ')
                                    )
                                )
                            ) as partner
                        FROM results_kp_mqap_institutions rkmi
                        left join results_knowledge_product rkp 
                        on rkmi.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and rkp.is_active > 0
                        left join results_by_institution rbi 
                        on rkmi.results_by_institutions_id = rbi.id
                            and rbi.is_active > 0
                            and rbi.institution_roles_id = 2
                        left join result_by_institutions_by_deliveries_type rbibdt 
                        on rbibdt.result_by_institution_id = rbi.id
                            and rbibdt.is_active > 0
                        left join clarisa_institutions ci8 
                        on ci8.id = rbi.institutions_id
                        left join clarisa_countries cc8
                        on ci8.headquarter_country_iso2 = cc8.iso_alpha_2
                        left join clarisa_institution_types cit8 
                        on cit8.code = ci8.institution_type_code 
                        left JOIN partner_delivery_type pdt 
                        on pdt.id = rbibdt.partner_delivery_type_id
                        WHERE rkmi.is_active > 0
                            and rkp.results_id = r.id
                        GROUP by rkp.results_id,
                            rbi.institutions_id,
                            rkmi.intitution_name,
                            rkmi.results_by_institutions_id
                    ) as q1
                    group by q1.results_id
                ),
                null) as kp_partner_data,
                -- section 4
            (
                SELECT
                    if(cgs.name is null, null,(if(cgs.id = 3,'National',cgs.name)))
                FROM
                    clarisa_geographic_scope cgs
                WHERE
                    cgs.id = r.geographic_scope_id
                GROUP BY
                    cgs.id,
                    cgs.name) as geo_focus,
                (
                SELECT
                    GROUP_CONCAT(DISTINCT cr.name separator ', ')
                FROM
                    result_region rr
                left join clarisa_regions cr 
            on
                    cr.um49Code = rr.region_id
                WHERE
                    rr.result_id = r.id
                    and rr.is_active = 1) as regions,
                (
                SELECT
                    if(rt.id <> 6,
                    GROUP_CONCAT(DISTINCT cc3.name separator ', '),
                    rkp.cgspace_countries)
                FROM
                    result_country rc2
                left join clarisa_countries cc3 
            on
                    cc3.id = rc2.country_id
                WHERE
                    rc2.result_id = r.id
                    and rc2.is_active = 1) as countries,
                -- section 5
                cast(if(res2.id is not null,concat('[', GROUP_CONCAT(DISTINCT json_object(
                    'text',CONCAT(res2.result_code, ': ', res2.result_type, ' - ', res2.title),
                    'link', CONCAT(p_pdf_url, res2.result_code,'?phase=',p_version_id) 
                ) separator ','), ']'), 'null') as json) as linked_results,
                (
                SELECT
                    cast(if(lr2.id is not null,concat('[', GROUP_CONCAT(DISTINCT json_object(
                        'text', lr2.legacy_link,
                        'link', lr2.legacy_link
                    ) separator ', '), ']'), 'null') as json)
                FROM
                    linked_result lr2
                WHERE
                    lr2.origin_result_id = r.id
                    and lr2.linked_results_id is NULL
                    and lr2.is_active > 0
                    and lr2.legacy_link is not NULL) as previous_portfolio,
                -- section 6
            (
                SELECT
                    cleanNullFromJsonArray(cast(concat('[', GROUP_CONCAT(DISTINCT if(locate('cgspace.cgiar.org',e.link) = 0, cast('null' as json), json_object('evidence', e.link, 'gender_related', COALESCE(e.gender_related, 0) = 1, 'climate_related', COALESCE(e.youth_related, 0) = 1, 'details', e.description)) SEPARATOR ','), ']') as json))
                FROM
                    evidence e
                WHERE
                    e.result_id = r.id
                    AND e.is_active > 0
            ) as linked_evidences
            FROM
                result r
            left join gender_tag_level gtl on
                gtl.id = r.gender_tag_level_id
            left join gender_tag_level gtl2 on
                gtl2.id = r.climate_change_tag_level_id
            left join results_by_inititiative rbi on
                rbi.result_id = r.id
                and rbi.initiative_role_id = 1
                and rbi.is_active > 0
            left join clarisa_initiatives ci on
                ci.id = rbi.inititiative_id
            left join results_by_inititiative rbi2 on
                rbi2.result_id = r.id
                and rbi2.initiative_role_id = 2
                and rbi2.is_active > 0
            left join clarisa_initiatives ci2 on
                ci2.id = rbi2.inititiative_id
            left join result_level rl ON
                rl.id = r.result_level_id
            left join result_type rt on
                rt.id = r.result_type_id
            left join non_pooled_project npp on
                npp.results_id = r.id
                and npp.is_active > 0
            left JOIN clarisa_center cc on
                cc.code = npp.lead_center_id
            left join clarisa_institutions ci3 on
                ci3.id = cc.institutionId
            left join clarisa_institutions ci4 on
                ci4.id = npp.funder_institution_id
            left join results_toc_result rtr on
                rtr.results_id = r.id
                and rtr.initiative_id = ci.id
                and rtr.is_active > 0
            left join toc_result tr on
                tr.toc_result_id = rtr.toc_result_id
            left join toc_level tl on
                tl.toc_level_id = tr.toc_level_id
            left join results_toc_result rtr2 on
                rtr2.results_id = r.id
                and rtr2.initiative_id <> ci.id
                and rtr2.is_active > 0
            left join clarisa_initiatives ci6 on
                ci6.id = rtr2.initiative_id
            left join toc_result tr2 on
                tr2.toc_result_id = rtr2.toc_result_id
            left join toc_level tl2 on
                tl2.toc_level_id = tr2.toc_level_id
            left join linked_result lr on
                lr.origin_result_id = r.id
                and lr.linked_results_id is not NULL
                and lr.is_active > 0
                and lr.legacy_link is NULL
            left join (
                select
                    r2.id,
                    r2.result_code,
                    r2.title,
                    rt2.name as result_type
                from
                    result r2
                left join result_type rt2 on
                    rt2.id = r2.result_type_id
                where
                    r2.is_active > 0) res2 on
                res2.id = lr.linked_results_id
            left join results_knowledge_product rkp on
                rkp.results_id = r.id
                and rkp.is_active > 0
            left join results_by_inititiative rbi3 on
                rbi3.result_id = r.id
            WHERE
                r.result_code = p_result_code
            GROUP by
                r.result_code,
                r.id,
                r.title,
                r.description,
                gtl.title,
                gtl2.title,
                rl.name,
                rt.name,
                r.is_krs,
                r.lead_contact_person,
                ci.official_code,
                rtr.result_toc_result_id,
                ci.official_code,
                ci.short_name,
                ci.name,
                r.no_applicable_partner,
                rkp.cgspace_countries,
                rt.id) as q1; 
        
        return basic_data;
        end;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `drop function if exists \`reportBasicInfoByResultCode\`;`,
    );
  }
}
