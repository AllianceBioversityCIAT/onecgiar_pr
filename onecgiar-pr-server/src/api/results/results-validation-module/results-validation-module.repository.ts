import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Validation } from './entities/validation.entity';

@Injectable()
export class resultValidationRepository extends Repository<Validation> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(Validation, dataSource.createEntityManager());
  }

  async version() {
	const query = `
	SELECT
		v.id AS version
	FROM
		version v
	WHERE
		v.phase_year = 2023
		AND v.phase_name LIKE '%Reporting%'
		AND v.is_active > 0
	LIMIT 1;
  	`
	try {
		const version = await this.dataSource.query(query);
		return version[0];
	} catch (error) {
		throw this._handlersError.returnErrorRepository({
			className: resultValidationRepository.name,
			error: error,
			debug: true,
		});
	}
  }

  async generalInformationValidation(
    resultId: number,
    resultLevel: number,
    resultType: number,
  ) {
	const {	version } = await this.version();

    const queryData = `
	SELECT
		'general-information' as section_name,
		CASE
			when (
				r.title is not null
				and r.title <> ''
			) ${
        resultType != 6
          ? `and 
				(r.description is not null
				and r.description <> '')`
          : ``
      }
			and (
				r.gender_tag_level_id is not null
				and r.gender_tag_level_id <> ''
			)
			and (
				r.climate_change_tag_level_id is not null
				and r.climate_change_tag_level_id <> ''
			)
			and (
				r.nutrition_tag_level_id is not null
				and r.nutrition_tag_level_id <> ''
			)
			and (
				r.environmental_biodiversity_tag_level_id is not null
				and r.environmental_biodiversity_tag_level_id <> ''
			)
			and (
				r.poverty_tag_level_id is not null
				and r.poverty_tag_level_id <> ''
			)
			and (r.is_krs in (0, 1)) ${
        resultLevel != 4 && resultLevel != 1
          ? `and 
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
				and rbit.is_active > 0) > 0))`
          : ``
      } then true
			else false
		END as validation
	FROM
		\`result\` r
	WHERE
		r.id = ?
		and r.is_active > 0
		and r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

    const queryData = `
	SELECT
		'theory-of-change' AS section_name,
		CASE
			WHEN (
				(
					SELECT COUNT(rc.id)
					FROM results_center rc
					WHERE rc.is_active > 0
					AND rc.result_id = r.id
				) = 0
			)
			${
			resultLevel != 2 && resultLevel != 1
				? `OR (
					(
						SELECT rtr.planned_result
						FROM results_toc_result rtr
						WHERE rtr.initiative_id IN (rbi.inititiative_id)
						AND rtr.results_id = r.id
						AND rtr.is_active > 0
					) IS NULL
				)`
				: ``
			}
			${
			resultLevel != 1
				? `OR (
					(
						SELECT IF(rtr.toc_result_id IS NULL OR rtr.action_area_outcome_id IS NULL, 1, 0)
						FROM results_toc_result rtr
						WHERE rtr.initiative_id IN (rbi.inititiative_id)
						AND rtr.results_id = r.id
						AND rtr.is_active > 0
					) = 0
				)
				OR (
					(
						IFNULL(
							(
								SELECT SUM(IF(rtr.toc_result_id IS NULL OR rtr.action_area_outcome_id IS NULL, 1, 0))
								FROM results_toc_result rtr
								WHERE rtr.initiative_id IN (rbi.inititiative_id)
								AND rtr.results_id = r.id
								AND rtr.is_active > 0
							),
							0
						)
					) - (
						SELECT COUNT(rbi.id)
						FROM results_by_inititiative rbi
						WHERE rbi.result_id = r.id
						AND rbi.initiative_role_id = 2
						AND rbi.is_active > 0
					)
				) <> 0`
				: ``
			}
			OR (
				(
					SELECT
						IFNULL(
							SUM(IF(npp.funder_institution_id IS NOT NULL AND npp.funder_institution_id <> '' AND 
								npp.grant_title IS NOT NULL AND npp.grant_title <> '' AND
								npp.lead_center_id IS NOT NULL AND npp.lead_center_id <> '', 1, 0)),
							0
						) - IFNULL(COUNT(npp.id), 0)
					FROM non_pooled_project npp
					WHERE npp.results_id = r.id
					AND npp.is_active > 0
				) <> 0
			)
			THEN FALSE
			${
			resultLevel == 3 || resultLevel == 4
				? `
				WHEN (
					rtr1.planned_result = 1
					AND (
						SELECT
							COUNT(*)
						FROM
							results_toc_result_indicators rtri
							LEFT JOIN results_toc_result rtr ON rtr.result_toc_result_id = rtri.results_toc_results_id
						WHERE
							rtr.results_id = r.id
							AND rtri.is_active = 1
							AND rtri.is_not_aplicable = 0
							AND (
								rtri.indicator_contributing IS NOT NULL
								AND rtri.indicator_contributing <> ''
							)
					) != (
						SELECT
							COUNT(*)
						FROM
							results_toc_result_indicators rtri2
							LEFT JOIN results_toc_result rtr2 ON rtr2.result_toc_result_id = rtri2.results_toc_results_id
						WHERE
							rtr2.results_id = r.id
							AND rtri2.is_active = 1
							AND rtri2.is_not_aplicable = 0
					)
				) THEN FALSE
				WHEN (
					rtr1.planned_result = 1
					AND rtr1.is_sdg_action_impact = 1
					AND (
						SELECT
							COUNT(*)
						FROM
							result_toc_impact_area_target rtia
							LEFT JOIN results_toc_result rtr2 ON rtr2.result_toc_result_id = rtia.result_toc_result_id
						WHERE
							rtr2.results_id = r.id
							AND rtia.is_active = 1
					) = 0
				) THEN FALSE
				WHEN (
					rtr1.planned_result = 1
					AND rtr1.is_sdg_action_impact = 1
					AND (
						SELECT
							COUNT(*)
						FROM
							result_toc_action_area rtaa
							LEFT JOIN results_toc_result rtr2 ON rtr2.result_toc_result_id = rtaa.result_toc_result_id
						WHERE
							rtr2.results_id = r.id
							AND rtaa.is_active = 1
					) = 0
				) THEN FALSE
				WHEN (
					rtr1.planned_result = 1
					AND rtr1.is_sdg_action_impact = 1
					AND (
						SELECT
							COUNT(*)
						FROM
							result_toc_sdg_targets rtsdgt
							LEFT JOIN results_toc_result rtr2 ON rtr2.result_toc_result_id = rtsdgt.result_toc_result_id
						WHERE
							rtr2.results_id = r.id
							AND rtsdgt.is_active = 1
					) = 0
				) THEN FALSE`
				: ``
			}
			${
				resultLevel == 1 || resultLevel == 2
				  ? `
				  WHEN (
					(
						SELECT 
							COUNT(*)
						FROM
							result_sdg_targets rst 
						WHERE
							rst.result_id = r.id
							AND rst.is_active = 1
					) = 0
				) 
				THEN FALSE
				WHEN (
					(
						SELECT 
							COUNT(*)
						FROM
							result_sdg_targets rst 
						WHERE
							rst.result_id = r.id
							AND rst.is_active = 1
					) = 0
				) 
				THEN FALSE`
				  : ``
			  }
			  ${
				resultLevel == 2
				  ? `
				  WHEN (
					rtr1.planned_result = 1
					AND rtr1.is_sdg_action_impact = 1
					AND (
						SELECT
							COUNT(*)
						FROM
							result_toc_impact_area_target rtia
							LEFT JOIN results_toc_result rtr2 ON rtr2.result_toc_result_id = rtia.result_toc_result_id
						WHERE
							rtr2.results_id = r.id
							AND rtia.is_active = 1
					) = 0
				) THEN FALSE`
				  : ``
			  }
			ELSE TRUE
		END AS validation
	FROM
		result r
	INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id AND rbi.initiative_role_id = 1
	LEFT JOIN results_toc_result rtr1 ON rtr1.results_id = r.id
	WHERE
		r.id = ?
	AND
		r.is_active > 0
	AND
		r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

    const queryData = `
	SELECT
		'partners' AS section_name,
		CASE
			WHEN r.no_applicable_partner = 1 THEN TRUE
			WHEN (
				(
					SELECT
						COUNT(rbi.id)
					FROM
						results_by_institution rbi
					WHERE
						rbi.result_id = r.id
						AND (
							rbi.institution_roles_id = 2
							OR rbi.institution_roles_id = 8
						)
						AND rbi.is_active > 0
				) <= 0
			) THEN FALSE
			WHEN (
				SELECT
					COUNT(*)
				FROM
					results_by_institution rbi2
				WHERE
					rbi2.result_id = r.id
					AND (
						rbi2.institution_roles_id = 2
						OR rbi2.institution_roles_id = 8
					)
					AND rbi2.is_active = TRUE
			) != (
				SELECT
					COUNT(DISTINCT rbibdt.result_by_institution_id)
				FROM
					result_by_institutions_by_deliveries_type rbibdt
				WHERE
					rbibdt.is_active = TRUE
					AND rbibdt.result_by_institution_id IN (
						SELECT
							rbi4.id
						FROM
							results_by_institution rbi4
						WHERE
							rbi4.result_id = r.id
							AND (
								rbi4.institution_roles_id = 2
								OR rbi4.institution_roles_id = 8
							)
							AND rbi4.is_active = TRUE
					)
			) THEN FALSE
			ELSE TRUE
		END AS validation
	FROM
		result r
	WHERE
		r.id = ?
		AND r.is_active > 0
		AND r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

    const queryData = `
	select
		'geographic-location' as section_name,
		CASE
			when (
				(
					if(
						r.has_regions = 1,
						(
							(
								select
									count(rr.result_region_id)
								from
									result_region rr
								WHERE
									rr.result_id = r.id
									and rr.is_active > 0
							) > 0
						),
						if(r.has_regions is null, false, true)
					)
				)
				AND (
					if(
						r.has_countries = 1,
						(
							(
								select
									count(rc.result_country_id)
								from
									result_country rc
								WHERE
									rc.result_id = r.id
									and rc.is_active > 0
							) > 0
						),
						if(r.has_countries is null, false, true)
					)
				)
			) then true
			else false
		END as validation
	from
		result r
	WHERE
		r.id = ?
		and r.is_active > 0
		and r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

    const queryData = `
	SELECT
		'evidences' AS section_name,
		CASE
			WHEN IF(
				rid.innovation_readiness_level_id = 11
				AND r.result_type_id = 7,
				TRUE,
				(
					(
						SELECT
							IF(
								(
									SUM(
										IF(
											e.link IS NOT NULL
											AND e.link <> '',
											1,
											0
										)
									) - COUNT(e.id)
								) IS NULL,
								0,
								(
									SUM(
										IF(
											e.link IS NOT NULL
											AND e.link <> '',
											1,
											0
										)
									) - COUNT(e.id)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 0
							AND e.is_active > 0
					) = 0
				)
				AND (
					(
						SELECT
							SUM(
								IF(
									r.gender_tag_level_id = 3
									AND e.gender_related = 1,
									1,
									IF(
										r.gender_tag_level_id IN (1, 2),
										1,
										IF(r.gender_tag_level_id IS NULL, 1, 0)
									)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 0
							AND e.is_active > 0
					) > 0
				)
				AND (
					(
						SELECT
							SUM(
								IF(
									r.climate_change_tag_level_id = 3
									AND e.youth_related = 1,
									1,
									IF(
										r.climate_change_tag_level_id IN (1, 2),
										1,
										IF(r.climate_change_tag_level_id IS NULL, 1, 0)
									)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 0
							AND e.is_active > 0
					) > 0
				)
				AND (
					(
						SELECT
							SUM(
								IF(
									r.nutrition_tag_level_id = 3
									AND e.nutrition_related = 1,
									1,
									IF(
										r.nutrition_tag_level_id IN (1, 2),
										1,
										IF(r.nutrition_tag_level_id IS NULL, 1, 0)
									)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 0
							AND e.is_active > 0
					) > 0
				)
				AND (
					(
						SELECT
							SUM(
								IF(
									r.environmental_biodiversity_tag_level_id = 3
									AND e.environmental_biodiversity_related = 1,
									1,
									IF(
										r.environmental_biodiversity_tag_level_id IN (1, 2),
										1,
										IF(
											r.environmental_biodiversity_tag_level_id IS NULL,
											1,
											0
										)
									)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 0
							AND e.is_active > 0
					) > 0
				)
				AND (
					(
						SELECT
							SUM(
								IF(
									r.poverty_tag_level_id = 3
									AND e.poverty_related = 1,
									1,
									IF(
										r.poverty_tag_level_id IN (1, 2),
										1,
										IF(r.poverty_tag_level_id IS NULL, 1, 0)
									)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 0
							AND e.is_active > 0
					) > 0
				)
				AND (
					(
						SELECT
							IF(
								(
									SUM(
										IF(
											e.link IS NOT NULL
											AND e.link <> '',
											1,
											0
										)
									) - COUNT(e.id)
								) IS NULL,
								0,
								(
									SUM(
										IF(
											e.link IS NOT NULL
											AND e.link <> '',
											1,
											0
										)
									) - COUNT(e.id)
								)
							)
						FROM
							evidence e
						WHERE
							e.result_id = r.id
							AND e.is_supplementary = 1
							AND e.is_active > 0
					) = 0
				)
			) THEN TRUE
			ELSE FALSE
		END AS validation
	FROM
		result r
		LEFT JOIN results_innovations_dev rid ON rid.results_id = r.id
		AND rid.is_active > 0
	WHERE
		r.id = ?
		AND r.is_active > 0
		AND r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

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
		and r.is_active > 0
		and r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

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
		and r.is_active > 0
		and r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
			when (
				if(
					rkp.is_melia = 1,
					if(
						rkp.melia_previous_submitted = 1,
						rkp.ost_melia_study_id is not null
						and rkp.ost_melia_study_id <> '',
						rkp.melia_type_id is not null
						and rkp.melia_type_id <> ''
					),
					if(rkp.is_melia is not null, true, false)
				)
			) then true
			else false
		END as validation
	from
		result r
		left join results_knowledge_product rkp on rkp.results_id = r.id
	WHERE
		r.id = ?
		and r.is_active > 0;
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();

    const queryData = `
	SELECT
		'cap-dev-info' as section_name,
		CASE
			WHEN (
				rcd.female_using IS NULL
				OR rcd.female_using = 0
			)
			OR (
				rcd.male_using IS NULL
				OR rcd.male_using = 0
			)
			OR (
				rcd.capdev_term_id IS NULL
				OR rcd.capdev_term_id = ''
			)
			OR (
				rcd.capdev_delivery_method_id IS NULL
				OR rcd.capdev_delivery_method_id = ''
			)
			OR (
				rcd.is_attending_for_organization IS NULL
			) THEN FALSE
			WHEN (
				rcd.is_attending_for_organization = 1
				AND (
					SELECT
						count(rbi.id)
					FROM
						results_by_institution rbi
					WHERE
						rbi.result_id = r.id
						AND rbi.institution_roles_id = 3
						AND rbi.is_active > 0
				) = 0
			) THEN FALSE
			ELSE TRUE
		END AS validation
	FROM
		result r
		LEFT JOIN results_capacity_developments rcd ON rcd.result_id = r.id
		AND rcd.is_active > 0
	WHERE
		r.id = ?
		AND r.is_active > 0
		AND r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
	const {	version } = await this.version();
	
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
		and r.is_active > 0
		and r.version_id = ${version};
    `;
    try {
      const shareResultRequest: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
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
      const shareResultRequest: Validation[] = await this.dataSource.query(
        queryData,
        [resultId],
      );
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
      const shareResultRequest: Array<{ validation: string }> =
        await this.dataSource.query(queryData, [resultId]);
      return shareResultRequest.length
        ? parseInt(shareResultRequest[0].validation)
        : 0;
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
      const shareResultRequest = await this.dataSource.query(queryData, [
        resultId,
      ]);
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
