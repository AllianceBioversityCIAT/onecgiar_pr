import { MigrationInterface, QueryRunner } from 'typeorm';

export class SectionSevenInfoFunctPDF1684500922445
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `drop function if exists \`reportSectionSevenByResultCode\`;`,
    );
    await queryRunner.query(`
        CREATE FUNCTION \`reportSectionSevenByResultCode\`(p_result_code bigint, p_version_id bigint) RETURNS json
        begin
            declare rt_id bigint;
            declare section_seven_response json;
        
        select r.result_type_id into rt_id from result r where r.result_code = p_result_code;
        
        if rt_id = 1 then
            BEGIN
                select
                    json_object(
                        "id", query_result.id,
                        "result_code", query_result.result_code,
                        "policy_type_id", query_result.policy_type_id,
                        "policy_type_name", query_result.policy_type_name,
                        "ammount", query_result.ammount,
                        "status_policy_change", query_result.status_policy_change,
                        "stage_policy_change", query_result.stage_policy_change,
                        "organization_policy_change", query_result.organization_policy_change
                    ) into section_seven_response
                from
                    (
                        select
                            -- result basic data
                            r.id,
                            r.result_code,
                            -- Action Area Outcome - Policy change specific fields
                            cpt.id as policy_type_id,
                            cpt.name as policy_type_name,
                            if(
                                cpt.id <> 1,
                                'Not applicable',
                                format(rpc.amount, 2)
                            ) ammount,
                            if(
                                cpt.id <> 1,
                                'Not applicable',
                                (
                                    case
                                        when rpc.status_amount = 1 then 'Confirmed'
                                        when rpc.status_amount = 2 then 'Estimated'
                                        when rpc.status_amount = 3 then 'Unknown'
                                        else null
                                    end
                                )
                            ) as status_policy_change,
                            concat(cps.name, ' - ', cps.definition) as stage_policy_change,
                            cast(
                                concat(
                                    '[', 
                                    group_concat(
                                        distinct concat(
                                            '"',
                                            if(
                                                coalesce(ci.acronym, '') = '',
                                                '',
                                                concat(ci.acronym, ' - ')
                                            ),
                                            ci.name,
                                            '"'
                                        ) separator ','
                                    ), 
                                    ']'
                                ) as json
                            ) as organization_policy_change
                        from
                            results_policy_changes rpc
                            right join result r on rpc.result_id = r.id
                            and r.is_active = 1
                            left join clarisa_policy_type cpt on rpc.policy_type_id = cpt.id
                            left join clarisa_policy_stage cps on rpc.policy_stage_id = cps.id
                            left join results_by_institution rbi on rbi.result_id = r.id
                            and rbi.is_active = 1
                            and rbi.institution_roles_id = 4
                            left join clarisa_institutions ci on rbi.institutions_id = ci.id
                            and ci.is_active = 1
                        where
                            rpc.is_active = 1
                            and r.result_code = p_result_code
                        group by
                            1, 2, 3, 4, 5, 6
                    ) as query_result
                ;
            END;
        elseIF rt_id = 2 THEN
            BEGIN
                select
                    json_object(
                        "id", query_result.id,
                        "result_code", query_result.result_code,
                        "innovation_female_using", query_result.female_using,
                        "innovation_male_using", query_result.male_using,
                        "quantifications", query_result.quantifications
                    ) into section_seven_response
                from
                    (
                        select
                            -- result basic data
                            r.id,
                            r.result_code,
                            -- Action Area Outcome - Innovation use specific fields
                            format(riu.female_using,0, 'es_ES') as female_using,
                            format(riu.male_using,0, 'es_ES') as male_using,
                            cast(
                                concat(
                                    '[', 
                                    group_concat(
                                        distinct json_object(
                                            'quantification_unit',
                                            rium.unit_of_measure,
                                            'quantification_value',
                                            format(rium.quantity,2, 'es_ES')
                                        ) separator ','
                                    ), 
                                    ']'
                                ) as json
                            ) as quantifications
                        from
                            results_innovations_use riu
                            left join result r on riu.results_id = r.id
                            and r.is_active = 1
                            left join results_innovations_use_measures rium on rium.result_innovation_use_id = riu.result_innovation_use_id
                            and rium.is_active = 1
                        where
                            riu.is_active = 1
                            and r.result_code = p_result_code
                        group by
                            1,2,3,4
                    ) as query_result
                ;
            END;
        elseIF rt_id = 5 THEN
            BEGIN
                select
                    json_object(
                        "id", query_result.id,
                        "result_code", query_result.result_code,
                        "capdev_female_using", query_result.female_using,
                        "capdev_male_using", query_result.male_using,
                        "capdev_term", query_result.capdev_term,
                        "capdev_delivery_method_name", query_result.capdev_delivery_method_name,
                        "organizations_capdev", query_result.organizations_capdev
                    ) into section_seven_response
                from
                    (
                        select
                            -- result basic data
                            r.id,
                            r.result_code,
                            -- Initiative Output - Capacity sharing for development specific fields
                            format(rcd.female_using,0, 'es_ES') as female_using,
                            format(rcd.male_using,0, 'es_ES') as male_using,
                            if(
                                ct.capdev_term_id in (3, 4),
                                ct.name,
                                concat(ct.term, ' - ', ct.name)
                            ) capdev_term,
                            cdm.name as capdev_delivery_method_name,
                            cast(
                                concat(
                                    '[', 
                                    group_concat(
                                        distinct concat(
                                            '"',
                                            if(
                                                coalesce(ci.acronym, '') = '',
                                                '',
                                                concat(ci.acronym, ' - ')
                                            ),
                                            ci.name,
                                            '"'
                                        ) separator ','
                                    ), 
                                    ']'
                                ) as json
                            ) as organizations_capdev
                        from
                            results_capacity_developments rcd
                            left join result r on rcd.result_id = r.id
                            and r.is_active = 1
                            left join capdevs_term ct on rcd.capdev_term_id = ct.capdev_term_id
                            left join capdevs_delivery_methods cdm on rcd.capdev_delivery_method_id = cdm.capdev_delivery_method_id
                            left join results_by_institution rbi on rbi.result_id = r.id
                            and rbi.is_active = 1
                            and rbi.institution_roles_id = 3
                            left join clarisa_institutions ci on rbi.institutions_id = ci.id
                            and ci.is_active = 1
                        where
                            rcd.is_active = 1
                            and r.result_code = p_result_code
                        group by
                            1,2,3,4,5,6
                    ) as query_result
                ;
            END;
        elseIF rt_id = 6 THEN
            BEGIN
                select
                    json_object(
                        "id", query_result.id,
                        "result_code", query_result.result_code,
                        "handle", query_result.handle,
                        "knowledge_product_type", query_result.knowledge_product_type,
                        "authors", query_result.authors,
                        "licence", query_result.licence,
                        "agrovocs", query_result.agrovocs,
                        "keywords", query_result.keywords,
                        "comodity", query_result.comodity,
                        "sponsors", query_result.sponsors,
                        "cgspace_metadata", query_result.cgspace_metadata,
                        "wos_metadata", query_result.wos_metadata,
                        "altmetric_url", query_result.altmetric_url,
                        "score", query_result.score,
                        "findable", query_result.findable,
                        "accesible", query_result.accesible,
                        "interoperable", query_result.interoperable,
                        "reusable", query_result.reusable
                    ) into section_seven_response
                from
                    (
                        select
                            -- result basic data
                            r.id,
                            r.result_code,
                            -- kp specific data
                            concat('cgspace.cgiar.org/', rkp.handle) handle,
                            rkp.knowledge_product_type,
                            group_concat(distinct rka.author_name separator '; ') authors,
                            rkp.licence,
                            group_concat(distinct agrovoc.keyword separator '; ') agrovocs,
                            group_concat(distinct keyword.keyword separator '; ') keywords,
                            rkp.comodity,
                            rkp.sponsors,
                            -- kp metadata (m-qap)
                            json_object(
                                            'isi', coalesce(cgspace.is_isi, 0) = 0,
                                            'open_access', cgspace.accesibility,
                                            'issue_date', cgspace.\`year\`, 
                                            'doi', cgspace.doi,
                                            'peer_reviewed', coalesce(cgspace.is_peer_reviewed, 0) = 0
                            ) as cgspace_metadata,
                            json_object(
                                            'isi', coalesce(wos.is_isi, 0) = 0,
                                            'open_access', wos.accesibility,
                                            'issue_date', wos.\`year\`, 
                                            'doi', wos.doi,
                                            'peer_reviewed', coalesce(wos.is_peer_reviewed, 0) = 0
                            ) as wos_metadata,
                            -- altmetrics data
                            concat('altmetric.com/details/', altmetrics.altmetric_id) altmetric_url,
                            altmetrics.score,
                            -- fair (most recent)
                            format(rkp.findable, 4) findable,
                            format(rkp.accesible, 4) accesible,
                            format(rkp.interoperable, 4) interoperable,
                            format(rkp.reusable, 4) reusable
                        from
                            result r
                            join result_type rt on r.result_type_id = rt.id
                            left join results_knowledge_product rkp on rkp.results_id = r.id
                            and rkp.is_active
                            left join results_kp_metadata cgspace on cgspace.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and cgspace.source = 'CGSpace'
                            and cgspace.is_active = 1
                            left join results_kp_metadata wos on wos.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and wos.source = 'WOS'
                            and wos.is_active = 1
                            left join results_kp_authors rka on rka.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and rka.is_active = 1
                            left join results_kp_keywords agrovoc on agrovoc.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and agrovoc.is_active = 1
                            and agrovoc.is_agrovoc = 1
                            left join results_kp_keywords keyword on keyword.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and keyword.is_active = 1
                            and keyword.is_agrovoc = 0
                            left join results_kp_altmetrics altmetrics on altmetrics.result_knowledge_product_id = rkp.result_knowledge_product_id
                            and altmetrics.is_active = 1
                        where
                            r.is_active
                            and r.result_code = p_result_code 
                            and rt.name = 'Knowledge Product'
                        group by
                            1,2,3,4,6,9,10,13,14,15,16,17,18
                        order by
                            1
                    ) as query_result
                ;
            END;
        elseIF rt_id = 7 THEN
            BEGIN
                select
                    json_object(
                        "id", query_result.id,
                        "result_code", query_result.result_code,
                        "short_title", query_result.short_title,
                        "characterization", query_result.characterization,
                        "nature", query_result.nature,
                        "new_variety_breed", query_result.new_variety_breed,
                        "lines_varieties", query_result.lines_varieties,
                        "innovation_developers", query_result.innovation_developers,
                        "innovation_collaborators", query_result.innovation_collaborators,
                        "innovation_acknowledgement", query_result.innovation_acknowledgement,
                        "readiness_level", query_result.readiness_level,
                        "readiness_level_justification", query_result.readiness_level_justification,
                        "published_ipsr", query_result.published_ipsr
                    ) into section_seven_response
                from
                    (
                        select
                            -- result basic data
                            r.id,
                            r.result_code,
                            -- Initiative Output - Innovation development specific fields
                            rid.short_title,
                            concat(cic.name, ': ', cic.definition) characterization,
                            concat(cit.name, ': ', cit.definition) nature,
                            if(
                                cit.code <> 12,
                                'Not applicable',
                                if(coalesce(rid.is_new_variety, 0) = 1, 'Yes', 'No')
                            ) as new_variety_breed,
                            if(
                                cit.code <> 12,
                                'Not applicable',
                                rid.number_of_varieties
                            ) lines_varieties,
                            rid.innovation_developers,
                            rid.innovation_collaborators,
                            rid.innovation_acknowledgement,
                            concat('Level ', cirl.id - 11, ': ', cirl.name) readiness_level,
                            rid.evidences_justification readiness_level_justification,
                            if(coalesce(rid.innovation_pdf, 0) = 1, 'Yes', 'No') published_ipsr
                        from
                            results_innovations_dev rid
                            left join result r on rid.results_id = r.id
                            and r.is_active = 1
                            left join clarisa_innovation_characteristic cic on rid.innovation_characterization_id = cic.id
                            left join clarisa_innovation_type cit on rid.innovation_nature_id = cit.code
                            left join clarisa_innovation_readiness_level cirl on rid.innovation_readiness_level_id = cirl.id
                        where
                            rid.is_active = 1
                            and r.result_code = p_result_code
                    ) as query_result
                ;
            END;
        else
            set section_seven_response = null;
        end if;
            set section_seven_response = json_merge_patch(section_seven_response, concat('{"result_type_id":', rt_id, "}"));
        return section_seven_response;
        end;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `drop function if exists \`reportSectionSevenByResultCode\`;`,
    );
  }
}
