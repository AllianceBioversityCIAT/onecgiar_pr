import { MigrationInterface, QueryRunner } from 'typeorm';
import { env } from 'process';

export class TOCFullInfoFunctPDF1684500648607 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const submissionDBName = env.DB_OST;
    await queryRunner.query(`drop function if exists \`tocInfoByResultCode\`;`);
    await queryRunner.query(`
        CREATE FUNCTION \`tocInfoByResultCode\`(p_result_code bigint, p_version_id bigint) RETURNS json
        begin
            
            declare toc_data json;
            declare specific_toc_section_data json;
            declare full_toc_data json;
            declare rl_id bigint;
        
            select r.result_level_id into rl_id from result r where r.result_code = p_result_code;
        
            if rl_id = 1 then
                begin
                    select json_object('impact_contribution',cast(concat('[', group_concat(distinct json_object(
                        'impact_area_name', q1.impact_area_name,
                        'targets', q1.targets,
                        'indicators', q1.indicators
                    )), ']') as json)) into specific_toc_section_data from (
                        select 
                            cia.name as impact_area_name,
                            (
                                select cast(concat('[', group_concat(distinct concat('"', cgt.target, '"')), ']') as json)
                                from results_impact_area_target riat
                                join clarisa_global_targets cgt on riat.impact_area_target_id = cgt.targetId
                                join result r on riat.result_id = r.id
                                where r.result_code = p_result_code and riat.is_active > 0 and cgt.impactAreaId = cia.id 
                            ) as targets,
                            (
                                select cast(concat('[', group_concat(distinct concat('"', ciai.indicator_statement, '"')), ']') as json)
                                from results_impact_area_indicators riai
                                join clarisa_impact_area_indicator ciai on riai.impact_area_indicator_id = ciai.id
                                join result r on riai.result_id = r.id
                                where r.result_code = p_result_code and riai.is_active > 0 and ciai.impact_area_id = cia.id
                            ) as indicators
                        from clarisa_impact_areas cia
                        order by cia.id
                    ) as q1;
                end;
            elseif rl_id = 2 then
                begin
                    SELECT json_object(
                        'primary_submitter_data', (
                            select 
                                json_object(
                                    'contributor_name', concat(ci.official_code, ' - ', ci.name),
                                    'action_area', caa.name,
                                    'mapped_action_area_outcome', caao.outcomeStatement
                                )
                            from clarisa_action_area caa
                            left join ${submissionDBName}.general_information s_gi on s_gi.action_area_id = caa.id
                            left join ${submissionDBName}.initiatives_by_stages s_ibs on s_gi.initvStgId = s_ibs.id and s_ibs.active > 0
                            left join results_by_inititiative rbi on rbi.inititiative_id = s_ibs.initiativeId and rbi.is_active > 0 and rbi.result_id = r.id
                            left join clarisa_initiatives ci on rbi.inititiative_id = ci.id
                            left join results_toc_result rtr on rtr.initiative_id = rbi.inititiative_id and rtr.is_active > 0 and rtr.results_id = r.id
                            left join clarisa_action_area_outcome caao on rtr.action_area_outcome_id = caao.id
                            where rbi.initiative_role_id = 1 and rtr.initiative_id = rbi.inititiative_id
                            limit 1
                        ),
                        'other_contributors_data', (
                            select 
                                cast(concat('[', group_concat(distinct json_object(
                                    'contributor_name', concat(ci.official_code, ' - ', ci.name),
                                    'action_area', caa.name,
                                    'mapped_action_area_outcome', caao.outcomeStatement
                                )), ']') as json)
                            from clarisa_action_area caa
                            left join ${submissionDBName}.general_information s_gi on s_gi.action_area_id = caa.id
                            left join ${submissionDBName}.initiatives_by_stages s_ibs on s_gi.initvStgId = s_ibs.id and s_ibs.active > 0
                            left join results_by_inititiative rbi on rbi.inititiative_id = s_ibs.initiativeId and rbi.is_active > 0 and rbi.result_id = r.id
                            left join clarisa_initiatives ci on rbi.inititiative_id = ci.id
                            left join results_toc_result rtr on rtr.initiative_id = rbi.inititiative_id and rtr.is_active > 0 and rtr.results_id = r.id
                            left join clarisa_action_area_outcome caao on rtr.action_area_outcome_id = caao.id		
                            where rbi.initiative_role_id = 2 and rtr.initiative_id = rbi.inititiative_id
                            group by rbi.inititiative_id
                        )) into specific_toc_section_data
                    FROM result r
                    where r.result_code = p_result_code;
                end;
            elseif rl_id in (3,4) then
                begin
                    select json_object(
                        'primary_submitter_data', (
                            SELECT 
                                json_object(
                                    'contributor_name', concat(ci.official_code, ' - ', ci.short_name), 
                                    'toc_level_id', if(rtr.planned_result is null, null, tl.toc_level_id), 
                                    'toc_level_name', if(rtr.planned_result is null, null, tl.name), 
                                    'contributor_can_match_result', rtr.planned_result, 
                                    'toc_name', if(rtr.planned_result is null, null, tr.title), 
                                    'workpackage_name', if(rtr.planned_result is null, null, s_wp.acronym),
                                    'toc_internal_id', if(trim(tr.toc_internal_id) = '', null, tr.toc_internal_id)
                                )
                            from
                                results_toc_result rtr 
                            left join results_by_inititiative rbi on rtr.initiative_id = rbi.inititiative_id and rtr.results_id = rbi.result_id and rbi.is_active > 0
                            left join toc_result tr on rtr.toc_result_id = tr.toc_result_id and tr.is_active > 0
                            left join toc_level tl on tr.toc_level_id = tl.toc_level_id
                            left join clarisa_initiatives ci on rtr.initiative_id = ci.id
                            left join ${submissionDBName}.work_packages s_wp on s_wp.id = tr.work_package_id 
                            where rtr.is_active > 0 and rtr.results_id = r.id and rbi.initiative_role_id = 1
                            limit 1
                        ),
                        'other_contributors_data', (
                            SELECT 
                                cast(concat('[', group_concat(distinct json_object(
                                    'contributor_name', concat(ci.official_code, ' - ', ci.short_name), 
                                    'toc_level_id', if(rtr.planned_result is null, null, tl.toc_level_id), 
                                    'toc_level_name', if(rtr.planned_result is null, null, tl.name), 
                                    'contributor_can_match_result', rtr.planned_result, 
                                    'toc_name', if(rtr.planned_result is null, null, tr.title), 
                                    'workpackage_name', if(rtr.planned_result is null, null, s_wp.acronym),
                                    'toc_internal_id', if(trim(tr.toc_internal_id) = '', null, tr.toc_internal_id)
                                )), ']') as json)
                            from
                                results_toc_result rtr 
                            left join results_by_inititiative rbi on rtr.initiative_id = rbi.inititiative_id and rtr.results_id = rbi.result_id and rbi.is_active > 0
                            left join toc_result tr on rtr.toc_result_id = tr.toc_result_id and tr.is_active > 0
                            left join toc_level tl on tr.toc_level_id = tl.toc_level_id
                            left join clarisa_initiatives ci on rtr.initiative_id = ci.id
                            left join ${submissionDBName}.work_packages s_wp on s_wp.id = tr.work_package_id 
                            where rtr.is_active > 0 and rtr.results_id = r.id and rbi.initiative_role_id = 2
                        )) into specific_toc_section_data
                    from result r
                    where r.result_code = p_result_code;
                end;
            else
                set specific_toc_section_data = null;
            end if;
        
            select json_object(
                "id", q1.id,
                "result_code", q1.result_code,
                "action_areas", q1.action_areas,
                "impact_areas", q1.impact_areas,
                "impact_area_targets", q1.impact_area_targets,
                "sdg_targets", q1.sdg_targets,
                "sdgs", q1.sdgs
            ) into toc_data from (	
            select
            r.id,
            r.result_code,
            (
            SELECT
                cast(concat('[', GROUP_CONCAT(DISTINCT concat('"',caa.name,'"') separator ','), ']') AS JSON)
            from
                ${submissionDBName}.toc_results_action_area_results traar
            join ${submissionDBName}.toc_action_area_results taar on
                traar.action_area_toc_result_id = taar.toc_result_id
            join ${submissionDBName}.clarisa_action_areas caa on
                caa.id = taar.action_areas_id
            WHERE
                traar.toc_result_id in (
                SELECT
                    tr.toc_internal_id
                from
                    result r8
                join results_toc_result rtr on
                    rtr.results_id = r8.id
                join toc_result tr on
                    tr.toc_result_id = rtr.toc_result_id
                WHERE
                    r8.id = r.id
                )
            ) as action_areas,
            (
            SELECT
                cast(concat('[', GROUP_CONCAT(DISTINCT concat('"',cia.name,'"') separator ','), ']') AS JSON)
            from
                ${submissionDBName}.toc_results_impact_area_results triar
            join ${submissionDBName}.toc_impact_area_results tiar on
                tiar.toc_result_id = triar.impact_area_toc_result_id
            join ${submissionDBName}.clarisa_impact_areas cia on
                cia.id = tiar.impact_area_id
            WHERE
                triar.toc_result_id in (
                SELECT
                    tr.toc_internal_id
                from
                    result r8
                join results_toc_result rtr on
                    rtr.results_id = r8.id
                join toc_result tr on
                    tr.toc_result_id = rtr.toc_result_id
                WHERE
                    r8.id = r.id
                    )
                ) as impact_areas,
            (
            SELECT
                cast(concat('[', GROUP_CONCAT(DISTINCT concat('"',cgt.target,'"') separator ','), ']') AS JSON)
            from
                ${submissionDBName}.toc_results_impact_area_results triar
            join ${submissionDBName}.toc_impact_area_results tiar on
                tiar.toc_result_id = triar.impact_area_toc_result_id
            join ${submissionDBName}.toc_impact_area_results_global_targets tiargt on
                tiargt.impact_area_toc_result_id = tiar.toc_result_id
            join ${submissionDBName}.clarisa_global_targets cgt on
                cgt.id = tiargt.global_target_id
            WHERE
                triar.toc_result_id in (
                SELECT
                    tr.toc_internal_id
                from
                    result r8
                join results_toc_result rtr on
                    rtr.results_id = r8.id
                join toc_result tr on
                    tr.toc_result_id = rtr.toc_result_id
                WHERE
                    r8.id = r.id
                    )
            ) as impact_area_targets,
            (
            SELECT
                cast(concat('[', GROUP_CONCAT(DISTINCT concat('"', cst.sdg_target_code, ' - ', cst.sdg_target, '"') separator ','), ']') AS JSON)
            from
                ${submissionDBName}.toc_results_impact_area_results triar
            join ${submissionDBName}.toc_impact_area_results tiar on
                tiar.toc_result_id = triar.impact_area_toc_result_id
            join ${submissionDBName}.toc_impact_area_results_sdg_results tiarsr on
                tiarsr.impact_area_toc_result_id = tiar.toc_result_id
            join ${submissionDBName}.toc_sdg_results tsr on
                tsr.toc_result_id = tiarsr.sdg_toc_result_id
            join ${submissionDBName}.toc_sdg_results_sdg_targets tsrst on
                tsrst.sdg_toc_result_id = tsr.toc_result_id
            join ${submissionDBName}.clarisa_sdg_targets cst on
                cst.id = tsrst.sdg_target_id
            WHERE
                triar.toc_result_id in (
                SELECT
                    tr.toc_internal_id
                from
                    result r8
                join results_toc_result rtr on
                    rtr.results_id = r8.id
                join toc_result tr on
                    tr.toc_result_id = rtr.toc_result_id
                WHERE
                    r8.id = r.id
                )
            ) as sdg_targets,
            (
            SELECT
                cast(concat('[', GROUP_CONCAT(DISTINCT cst.sdg -> "$.shortName" separator ','), ']') AS JSON)
            from
                ${submissionDBName}.toc_results_impact_area_results triar
            join ${submissionDBName}.toc_impact_area_results tiar on
                tiar.toc_result_id = triar.impact_area_toc_result_id
            join ${submissionDBName}.toc_impact_area_results_sdg_results tiarsr on
                tiarsr.impact_area_toc_result_id = tiar.toc_result_id
            join ${submissionDBName}.toc_sdg_results tsr on
                tsr.toc_result_id = tiarsr.sdg_toc_result_id
            join ${submissionDBName}.toc_sdg_results_sdg_targets tsrst on
                tsrst.sdg_toc_result_id = tsr.toc_result_id
            join ${submissionDBName}.clarisa_sdg_targets cst on
                cst.id = tsrst.sdg_target_id
            WHERE
                triar.toc_result_id in (
                SELECT
                    tr.toc_internal_id
                from
                    result r8
                join results_toc_result rtr on
                    rtr.results_id = r8.id
                join toc_result tr on
                    tr.toc_result_id = rtr.toc_result_id
                WHERE
                    r8.id = r.id
                )
            ORDER BY cst.sdg -> "$.usndCode"
            ) as sdgs
            from result r
            WHERE r.result_code = p_result_code
            ) as q1
            ;
        
        set full_toc_data = json_merge_patch(toc_data, specific_toc_section_data);
            
        return full_toc_data;
        end;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop function if exists \`tocInfoByResultCode\`;`);
  }
}
