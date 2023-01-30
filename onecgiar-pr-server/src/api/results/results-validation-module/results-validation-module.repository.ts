import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Validation } from './entities/validation.entity';

@Injectable()
export class resultValidationRepository extends Repository<Validation>{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
	super(Validation, dataSource.createEntityManager());
  }

  async generalInformationValidation(resultId: number, resultLevel: number, resultType: number) {
    const queryData = `
    SELECT
		'general-information' as section_name,
		CASE
			when (r.title is not null
			and r.title <> '')
			${resultType != 6?`and 
		 	(r.description is not null
			and r.description <> '')`:``}
			and 
		 	(r.gender_tag_level_id is not null
			and r.gender_tag_level_id <> '')
			and 
		 	(r.climate_change_tag_level_id is not null
			and r.climate_change_tag_level_id <> '')
			and 
		 	(r.is_krs in (0, 1))
			${resultLevel != 4 && resultLevel != 1?`and 
		 	(((
			select
				COUNT(rbi.id)
			from
				results_by_institution rbi
			WHERE
				rbi.institution_roles_id = 1
				and rbi.result_id = r.id
				and rbi.is_active > 0) > 0)
			or
			((
			   select
			   COUNT(rbit.id)
			   from
			   results_by_institution_type rbit
			   WHERE
				   rbit.institution_roles_id = 1
			   and rbit.results_id = r.id
			   and rbit.is_active > 0) > 0))`:``}
		 then true
			else false
		END as validation
	FROM
		\`result\` r
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async tocValidation(resultId: number, resultLevel: number) {
    const queryData = `
    SELECT 
		'theory-of-change' as section_name,
		CASE 
			when 
			((
			select
				COUNT(rc.id)
			from
				results_center rc
			WHERE
				rc.is_active > 0
				and rc.result_id = r.id) > 0)
			${resultLevel != 2 && resultLevel != 1? `AND 
			((
			SELECT
				rtr.planned_result
			FROM
				results_toc_result rtr
			WHERE
				rtr.initiative_id in (rbi.inititiative_id)
					and rtr.results_id = r.id
					and rtr.is_active > 0) is not null)`:``}
			${resultLevel != 1?`AND 
			((
			select
				if(rtr.toc_result_id is not null
					or rtr.action_area_outcome_id is not null,
					1,
					0)
			from
				results_toc_result rtr
			WHERE
				rtr.initiative_id in (rbi.inititiative_id)
					and rtr.results_id = r.id
					and rtr.is_active > 0) = 1)
			AND 
			(((
			IFNULL((select
				sum(if(rtr.toc_result_id is not null or rtr.action_area_outcome_id is not null, 1, 0))
			from
				results_toc_result rtr
			WHERE
				rtr.initiative_id not in (rbi.inititiative_id)
					and rtr.results_id = r.id
					and rtr.is_active > 0), 0)) -
			(
			select
				COUNT(rbi.id)
			from
				results_by_inititiative rbi
			WHERE
				rbi.result_id = r.id
				and rbi.initiative_role_id = 2
				and rbi.is_active > 0)) = 0)`:`AND
				((SELECT count(DISTINCT cgt.impactAreaId)
				from results_impact_area_target riat 
				inner join clarisa_global_targets cgt on cgt.targetId = riat.impact_area_target_id 
				where riat.result_id = r.id
					and riat.impact_area_target_id is not null
					and riat.is_active > 0) = 5)
				AND
				((SELECT count(DISTINCT ciai.impact_area_id)
				from results_impact_area_indicators riai 
				inner join clarisa_impact_area_indicator ciai on ciai.id = riai.impact_area_indicator_id 
				where riai.result_id = r.id
					and riai.impact_area_indicator_id is not null
					and riai.is_active > 0) = 5)
				`}
			AND 
			((
			select
			IFNULL(sum(if(npp.funder_institution_id is not null and npp.funder_institution_id <> '' AND 
							npp.grant_title is not null and npp.grant_title <> '' AND
							npp.lead_center_id is not null and npp.lead_center_id <> '', 1, 0)), 0) - IFNULL(COUNT(npp.id), 0)
			from
				non_pooled_project npp
			WHERE
				npp.results_id = r.id
				and npp.is_active > 0) = 0)
			then true
			else false
		END as validation
	from
		\`result\` r
	inner join results_by_inititiative rbi on
		rbi.result_id = r.id
		and rbi.initiative_role_id = 1
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async partnersValidation(resultId: number) {
    const queryData = `
    select
		'partners' as section_name,
		CASE
			when r.no_applicable_partner = 1 then true
			else (case
				when 
				((
				SELECT
					COUNT(rbi.id)
				FROM
					results_by_institution rbi
				WHERE
					rbi.result_id = r.id
					and rbi.institution_roles_id = 2
					and rbi.is_active > 0) > 0) THEN true
				else false
			end)
		END as validation
	from
		\`result\` r
	WHERE
		r.id = ?
		and r.is_active > 0;

    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async geoLocationValidation(resultId: number) {
    const queryData = `
	select
			'geographic-location' as section_name,
			CASE
				when ((if(r.has_regions = 1 ,
				((
			select
							count(rr.result_region_id)
			from
							result_region rr
			WHERE
							rr.result_id = r.id
				and rr.is_active > 0) > 0),
				if(r.has_regions is null,
			false,
			true)))
			AND 
						(if(r.has_countries = 1 ,
				((
			select
							count(rc.result_country_id)
			from
							result_country rc
			WHERE
							rc.result_id = r.id
				and rc.is_active > 0) > 0),
				if(r.has_countries is null,
			false,
			true)))) then true
			else false
		END as validation
	from
			\`result\` r
	WHERE
			r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async linksResultsValidation(resultId: number) {
    const queryData = `
	
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async evidenceValidation(resultId: number) {
    const queryData = `
	SELECT
			'evidences' as section_name,
			CASE
				when if(rid.innovation_readiness_level_id = 11 and r.result_type_id = 7, true,((
			SELECT
					if((sum(if(e.link is not null and e.link <> '', 1, 0)) - count(e.id)) is null,
					0,
					(sum(if(e.link is not null and e.link <> '', 1, 0)) - count(e.id)))
			from
					evidence e
			where
					e.result_id = r.id
				and e.is_supplementary = 0
				and e.is_active > 0) = 0)
			and
			((
			SELECT
				sum(if(r.gender_tag_level_id = 3 and e.gender_related = 1, 1, if(r.gender_tag_level_id in (1, 2), 1, if(r.gender_tag_level_id  is null,1,0))))
			from
				evidence e
			where
				e.result_id = r.id
				and e.is_supplementary = 0
				and e.is_active > 0) > 0)
			and
			((
			SELECT
				sum(if(r.climate_change_tag_level_id = 3 and e.youth_related = 1, 1, if(r.climate_change_tag_level_id in (1, 2), 1, if(r.climate_change_tag_level_id is null,1,0))))
			from
				evidence e
			where
				e.result_id = r.id
				and e.is_supplementary = 0
				and e.is_active > 0) > 0)
			and
			((
			SELECT
					if((sum(if(e.link is not null and e.link <> '', 1, 0)) - count(e.id)) is null,
					0,
					(sum(if(e.link is not null and e.link <> '', 1, 0)) - count(e.id)))
			from
					evidence e
			where
					e.result_id = r.id
				and e.is_supplementary = 1
				and e.is_active > 0) = 0))
			then TRUE
			else false
		END as validation
	from
			\`result\` r
		left join results_innovations_dev rid on
		rid.results_id = r.id
		and rid.is_active > 0
	WHERE
			r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async innovationUseValidation(resultId: number) {
    const queryData = `
	SELECT
		'innovation-use-info' as section_name,
		CASE
			when (riu.male_using is not null
			and riu.male_using <> '')
			and 
		(riu.female_using is not null
			and riu.female_using <> '')
		then TRUE
			else false
		END as validation
	from
		\`result\` r
	left join results_innovations_use riu on
		riu.results_id = r.id
		and riu.is_active > 0
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async innovationDevValidation(resultId: number) {
    const queryData = `
	SELECT
		'innovation-dev-info' as section_name,
		CASE
			when (rid.short_title is not null
			and rid.short_title <> '')
			AND 
			(rid.innovation_characterization_id is not null
			and rid.innovation_characterization_id <> '')
			AND 
			(rid.innovation_nature_id is not null
			and rid.innovation_nature_id <> '')
			AND 
			(if(rid.innovation_nature_id = 12, rid.is_new_variety in (1,0), true))
			AND 
			(rid.innovation_readiness_level_id is not null
			and rid.innovation_readiness_level_id <> '')
			AND 
			(rid.innovation_pdf in (1,0))
			then true
			else false
		END as validation
	from
		\`result\` r
	left join results_innovations_dev rid on
		rid.results_id = r.id
		and rid.is_active > 0
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async knowledgeProductValidation(resultId: number) {
    const queryData = `
	select
			'knowledge-product-info' as section_name,
			CASE
				when (if(rkp.is_melia = 1,
			if(rkp.melia_previous_submitted = 1,
			rkp.ost_melia_study_id is not null
			and rkp.ost_melia_study_id <> '',
			rkp.melia_type_id is not null
			and rkp.melia_type_id <> '') ,
			if(rkp.is_melia is not null,
			true,
			false))) then true
			else false
		END as validation
	from
			\`result\` r
	left join results_knowledge_product rkp on
		rkp.results_id = r.id
	WHERE
			r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async capDevValidation(resultId: number) {
    const queryData = `
	SELECT
		'cap-dev-info' as section_name,
		CASE
			when (rcd.female_using is not null
			and rcd.female_using >= 0)
			AND 
			(rcd.male_using is not null
			and rcd.male_using >= 0)
			AND 
			(rcd.capdev_term_id is not null
			and rcd.capdev_term_id <> '') 
			AND 
			(rcd.capdev_delivery_method_id  is not null
			and rcd.capdev_delivery_method_id <> '') then true
			else false
		END as validation
	from
		\`result\` r
	left join results_capacity_developments rcd on
		rcd.result_id = r.id
		and rcd.is_active > 0
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async policyChangeValidation(resultId: number) {
    const queryData = `
	SELECT
		'policy-change1-info' as section_name,
		CASE
			when (rpc.policy_type_id is not null
			and rpc.policy_type_id <> '')
			AND 
			(rpc.policy_stage_id is not null
			and rpc.policy_stage_id <> '')
			AND 
			((
			SELECT
				count(rbi.id)
			from
				results_by_institution rbi
			where
				rbi.result_id = r.id
				and rbi.institution_roles_id = 4
				and rbi.is_active > 0) > 0)
			then TRUE
			else false
		END as validation
	from
		\`result\` r
	left join results_policy_changes rpc on
		rpc.result_id = r.id
		and rpc.is_active > 0
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async validationResultExist(resultId: number) {
    const queryData = `
	SELECT
		v.id,
		v.section_seven,
		v.general_information,
		v.theory_of_change,
		v.partners,
		v.geographic_location,
		v.links_to_results,
		v.evidence,
		v.results_id
	from
		validation v
	WHERE
		v.results_id = ?
		and v.is_active > 0
	order by v.id desc;
    `;
    try {
      const shareResultRequest: Validation[] = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? shareResultRequest[0] : null;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async resultIsValid(resultId: number) {
    const queryData = `
	SELECT
		IFNULL(v.section_seven, 1) *
  		v.general_information *
  		v.theory_of_change *
  		v.partners *
  		v.geographic_location *
  		v.links_to_results *
  		v.evidence as validation
  	from validation v 
  		WHERE v.results_id = ?
		  and v.is_active > 0;
    `;
    try {
      const shareResultRequest: Array<{validation:string}> = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest.length ? parseInt(shareResultRequest[0].validation) : 0;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async inactiveOldInserts(resultId: number) {
    const queryData = `
		UPDATE validation 
			set is_active = 0
		WHERE results_id = ?;
    `;
    try {
      const shareResultRequest = await this.dataSource.query(queryData, [resultId]); 
	  return shareResultRequest;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async inactiveAllOldInserts() {
    const queryData = `
		UPDATE validation 
			set is_active = 0;
    `;
    try {
      const shareResultRequest = await this.dataSource.query(queryData); 
	  return shareResultRequest;
    } catch (error) {
		throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}

