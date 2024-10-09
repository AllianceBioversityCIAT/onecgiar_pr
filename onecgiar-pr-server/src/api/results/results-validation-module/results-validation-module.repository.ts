import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Validation } from './entities/validation.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { GetValidationSectionDto } from './dto/getValidationSection.dto';
import { Evidence } from '../evidences/entities/evidence.entity';
import { env } from 'process';

@Injectable()
export class resultValidationRepository
  extends Repository<Validation>
  implements LogicalDelete<Validation>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(Validation, dataSource.createEntityManager());
  }

  private _regex = new RegExp(
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/\S*)?$/i,
  );

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete v from validation v where v.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: resultValidationRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<Validation> {
    const queryData = `update validation v set v.is_active = 0 where v.results_id = ? and v.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: resultValidationRepository.name,
          debug: true,
        }),
      );
  }

  async oldGreenCheckVersion(resultId: number) {
    const query = `
	SELECT
		v.section_seven,
		v.general_information,
		v.theory_of_change,
		v.partners,
		v.geographic_location,
		v.links_to_results,
		v.evidence
	FROM
		validation v
	WHERE
		v.results_id = ${resultId}
		and v.is_active > 0
	LIMIT
		1;
  	`;
    try {
      const oldGC = await this.dataSource.query(query);
      return oldGC[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async version() {
    const query = `
	SELECT
		v.id AS version
	FROM
		version v
	WHERE
		v.phase_name LIKE '%Reporting%'
		AND v.is_active > 0
		AND v.status = 1
	LIMIT 1;
  	`;
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
    const { version } = await this.version();

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
				if(r.result_type_id = 7, if(r.is_discontinued = 0 or r.is_replicated = 0,
				0,
				(select sum(if(rido.investment_discontinued_option_id = 6, if(rido.description <> '' and rido.description is not null, 1, 0),1)) - count(rido.results_investment_discontinued_option_id) as datas
				from results_investment_discontinued_options rido
				where rido.is_active > 0 and rido.result_id = r.id)), 0) = 0
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
			and (r.is_krs in (0, 1))
			then true
			else false
		END as validation
	FROM
		\`result\` r
	WHERE
		r.id = ?
		AND r.is_active > 0
		AND (
		    r.version_id = ${version}
				OR r.created_date > ${env.PREVIOUS_PHASE_DATE}
		);
    `;
    try {
      const validationGeneralInformation: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);
      return validationGeneralInformation.length
        ? validationGeneralInformation[0]
        : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async tocValidation(resultId: number, resultLevel: number) {
    const { version } = await this.version();

    const queryData = `
	SELECT
		'theory-of-change' AS section_name,
		CASE
			${
        resultLevel != 2 && resultLevel != 1
          ? `WHEN (
			(
				SELECT SUM(IF(rtr.planned_result is null, 0, 1))
				FROM results_toc_result rtr
				WHERE rtr.results_id = r.id
				AND rtr.is_active > 0
			) = (
				SELECT COUNT(*)
				FROM results_toc_result rtr
				WHERE rtr.results_id = r.id
				AND rtr.is_active > 0
				AND toc_result_id IS NOT NULL
			)
		)
		AND (
			(
				SELECT IF(COUNT(rtr.toc_result_id IS NOT NULL) = 0, 0, 1)
				FROM results_toc_result rtr
				WHERE rtr.initiative_id IN (rbi.inititiative_id)
				AND rtr.results_id = r.id
				AND rtr.toc_result_id IS NOT NULL
				AND rtr.is_active > 0
			) = 1
		)
		AND  (
			(
				IFNULL(
					(
						SELECT COUNT(DISTINCT rtr.initiative_id)
						FROM results_toc_result rtr
						WHERE rtr.initiative_id NOT IN (rbi.inititiative_id)
						AND rtr.results_id = r.id
						AND rtr.is_active > 0
						AND rtr.toc_result_id IS NOT NULL
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
		) = 0`
          : ``
      }
			${
        resultLevel == 1
          ? `
					WHEN (
						(SELECT COUNT(DISTINCT cgt.impactAreaId)
						FROM results_impact_area_target riat
						INNER JOIN clarisa_global_targets cgt ON cgt.targetId = riat.impact_area_target_id
						WHERE riat.result_id = r.id
						AND riat.impact_area_target_id IS NULL
						AND riat.is_active > 0) < 5
					)
					AND (
						(SELECT COUNT(DISTINCT ciai.impact_area_id)
						FROM results_impact_area_indicators riai
						INNER JOIN clarisa_impact_area_indicator ciai ON ciai.id = riai.impact_area_indicator_id
						WHERE riai.result_id = r.id
						AND riai.impact_area_indicator_id IS NULL
						AND riai.is_active > 0) < 5
					)
				`
          : ``
      } THEN TRUE
			ELSE FALSE
		END AS validation
	FROM
		\`result\` r
	INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id AND rbi.initiative_role_id = 1
	LEFT JOIN results_toc_result rtr1 ON rtr1.results_id = r.id
	  		AND rtr1.is_active > 0
	WHERE
		r.id = ?
	AND
		r.is_active > 0
	AND (
	    r.version_id = ${version}
			OR r.created_date > ${env.PREVIOUS_PHASE_DATE}
	);
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
    const { version } = await this.version();

    const queryData = `
	SELECT
	'partners' AS section_name,
	CASE
		WHEN r.is_lead_by_partner IS NULL THEN FALSE
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
			) <= 0  AND r.no_applicable_partner = 0
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
		WHEN (
			(
				SELECT
					COUNT(rc.id)
				FROM
					results_center rc
				WHERE
					rc.is_active > 0
					AND rc.result_id = r.id
			) <= 0
		) THEN FALSE
		WHEN (
			(
				SELECT
					CASE
						#if there are not non-pooled, we consider this as valid
						WHEN IFNULL(COUNT(npp.id),0) = 0 THEN 1
						#if the difference between the number of valid non-pooled and the total number is 0, then this is valid
						ELSE (
							IFNULL(
								SUM(
									IF(
										(
											npp.funder_institution_id IS NOT NULL AND npp.funder_institution_id > 0 AND
											COALESCE(npp.grant_title, '') <> '' AND COALESCE(npp.lead_center_id, '') <> ''
										),
										1, 0
									)
								),
								0
							) - IFNULL(COUNT(npp.id), 0) = 0
						)
					END as npp_validation
				FROM
					non_pooled_project npp
				WHERE
					npp.results_id = r.id
					AND npp.is_active > 0
			) = 0
		) THEN FALSE
		WHEN (
			(
				SELECT
					COUNT(rbi2.id)
				FROM results_by_institution rbi2
				WHERE
					rbi2.is_active
					AND rbi2.result_id = r.id
					AND rbi2.is_leading_result = 1
			) <> 1 AND r.is_lead_by_partner = 1
		) THEN FALSE
		WHEN (
			(
				SELECT
					COUNT(rc.id)
				FROM
					results_center rc
				WHERE
					rc.is_active
					AND rc.result_id = r.id
					AND rc.is_leading_result = 1
			) <> 1 AND r.is_lead_by_partner = 0
		) THEN FALSE
		ELSE TRUE
	END AS validation
	FROM
		result r
	WHERE
		r.id = ?
		AND r.is_active > 0
		AND (
		    r.version_id = ${version}
			OR r.created_date > ${env.PREVIOUS_PHASE_DATE}
		);
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
    const { version } = await this.version();

    const queryData = `
	select
		'geographic-location' as section_name,
		case
			when r.geographic_scope_id in (1, 2) then (
				(
					if(
						r.has_regions = 1 or r.geographic_scope_id = 2,
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
			)
			when r.geographic_scope_id in (3,4) then (
							(
								select
									count(rc.result_country_id)
								from
									result_country rc
								WHERE
									rc.result_id = r.id
									and rc.is_active > 0
							) > 0
						)
			when r.geographic_scope_id = 5 then (select if(count(*) - sum(temp.sub_counter) = 0, true, false)
													from (select if((select count(css.code)
										from clarisa_subnational_scopes css
										where css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, count(rcs.result_country_subnational_id) > 0, true) as sub_counter
									from
									result_country rc
									left join clarisa_countries cc on cc.id = rc.country_id
									left join result_country_subnational rcs on rcs.result_country_id = rc.result_country_id
																				and rcs.is_active > 0
								WHERE
									rc.result_id = r.id
									and rc.is_active > 0
								GROUP by  rc.country_id, cc.name) temp)
			when r.geographic_scope_id = 50 then true
		end as validation
	FROM
		result r
	WHERE
		r.id = ?
		AND r.is_active > 0
		AND (
		    r.version_id = ${version}
				OR r.created_date > ${env.PREVIOUS_PHASE_DATE}
		);
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

  async evidenceValidation(resultTypeId: number, resultId: number) {
    try {
      const { version } = await this.version();

      const queryData = `
		SELECT
			'evidences' AS section_name,
			CASE
				WHEN (
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
					AND(
						IF(
							r.result_type_id = 7 AND cirl.\`level\` <> 0,
							(
								select
									count(*)
								from 
									evidence e
								where 
									e.result_id = r.id
									and e.is_active
									and e.innovation_readiness_related
									and (
										coalesce(trim(e.link), '')<> ''
									)
							) > 0,
							true
						)
					)
				) THEN TRUE
				ELSE FALSE
			END AS validation
		FROM
			result r
		LEFT JOIN results_innovations_dev rid ON rid.results_id = r.id
			AND rid.is_active > 0
		LEFT JOIN clarisa_innovation_readiness_level cirl
			ON rid.innovation_readiness_level_id = cirl.id
		WHERE
			r.id = ${resultId}
			AND r.is_active > 0
			AND (
			    r.version_id = ${version}
					OR r.created_date > ${env.PREVIOUS_PHASE_DATE}
			);
	`;

      const level = await this.innoReadinessLevel(resultId);
      let isAnyDAC3 = false;

      const allEvidences = (await this.query(
        'select * from evidence e where e.result_id = ? and e.is_active',
        [resultId],
      )) as Evidence[];
      const multiplePerField = allEvidences.some(
        (e) => e.link && this._regex.test(e.link.trim()),
      );

      if (resultTypeId == 5 && allEvidences.length == 0) {
        return {
          section_name: 'evidences',
          validation: 1,
        };
      } else if (resultTypeId == 7) {
        const dacQuery = `
			SELECT
				r.gender_tag_level_id,
				r.climate_change_tag_level_id,
				r.nutrition_tag_level_id,
				r.environmental_biodiversity_tag_level_id,
				r.poverty_tag_level_id
			FROM
				result r
			WHERE
				r.id = ${resultId}
				AND r.is_active > 0
				AND (
				    r.version_id = ${version}
						OR r.created_date > ${env.PREVIOUS_PHASE_DATE}
				);
		`;

        const dacResults = await this.dataSource.query(dacQuery);
        isAnyDAC3 = dacResults.some(
          (row: any) =>
            row.gender_tag_level_id == 3 ||
            row.climate_change_tag_level_id == 3 ||
            row.nutrition_tag_level_id == 3 ||
            row.environmental_biodiversity_tag_level_id == 3 ||
            row.poverty_tag_level_id == 3,
        );

        if (isAnyDAC3) {
          const evidenceValidations: GetValidationSectionDto[] =
            await this.dataSource.query(queryData);

          if (evidenceValidations.length > 0) {
            return {
              section_name: evidenceValidations[0].section_name,
              validation: +(
                Number(evidenceValidations[0].validation) && multiplePerField
              ),
            };
          }

          return undefined;
        } else if (resultTypeId == 7 && level == 0) {
          const response = {
            section_name: 'evidences',
            validation: 1,
          };

          return response;
        }
      }

      const evidenceValidations: GetValidationSectionDto[] =
        await this.dataSource.query(queryData, [resultId]);

      if (evidenceValidations.length > 0) {
        return {
          section_name: evidenceValidations[0].section_name,
          validation: +(
            Number(evidenceValidations[0].validation) && multiplePerField
          ),
        };
      }

      return undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async innovationUseValidation(resultId: number) {
    const { version } = await this.version();

    const queryData = `
	SELECT
		'innovation-use-info' as section_name,
		CASE
			WHEN (
				(
					SELECT
						COUNT(*)
					FROM
						result_actors ra
					WHERE
						ra.result_id = r.id
						AND ra.is_active = 1
						AND (
							(
								ra.sex_and_age_disaggregation = 0
								AND (
									(
										ra.actor_type_id != 5
										AND ra.women IS NOT NULL
										AND ra.women_youth IS NOT NULL
										AND ra.men IS NOT NULL
										AND ra.men_youth IS NOT NULL
									)
									OR (
										ra.actor_type_id = 5
										AND (
											ra.other_actor_type IS NOT NULL
											OR TRIM(ra.other_actor_type) <> ''
										)
									)
								)
							)
							OR (
								ra.sex_and_age_disaggregation = 1
								OR (
									ra.actor_type_id = 5
									AND (
										ra.other_actor_type IS NOT NULL
										AND TRIM(ra.other_actor_type) <> ''
										AND ra.how_many IS NOT NULL
									)
								)
							)
						)
				) = 0
				AND (
					SELECT
						COUNT(*)
					FROM
						results_by_institution_type rbit
					WHERE
						rbit.results_id = r.id
						AND rbit.is_active = true
						AND rbit.institution_roles_id = 5
						AND (
							(
								rbit.institution_types_id != 78
								AND(
									rbit.institution_roles_id IS NOT NULL
									AND rbit.institution_types_id IS NOT NULL
								)
							)
							OR (
								rbit.institution_types_id = 78
								AND (
									rbit.other_institution IS NOT NULL
									OR rbit.other_institution != ''
									AND rbit.institution_roles_id IS NOT NULL
									AND rbit.institution_types_id IS NOT NULL
								)
							)
						)
				) = 0
				AND (
					SELECT
						COUNT(*)
					FROM
						result_ip_measure rim
					WHERE
						rim.result_id = r.id
						AND rim.is_active = TRUE
						AND rim.unit_of_measure IS NOT NULL
				) = 0
			) THEN FALSE
			WHEN (
				SELECT
					COUNT(*)
				FROM
					result_actors ra
				WHERE
					ra.result_id = r.id
					AND ra.is_active = 1
					AND (
						(
							ra.sex_and_age_disaggregation = 0
							AND (
								ra.women IS NULL
								AND ra.women IS NULL
								AND ra.women_youth IS NULL
								AND ra.men IS NULL
								AND ra.men_youth IS NULL
								OR (
									ra.actor_type_id = 5
									AND (
										ra.other_actor_type IS NULL
										OR TRIM(ra.other_actor_type) = ''
									)
								)
							)
						)
						OR (
							ra.sex_and_age_disaggregation = 1
							AND ra.how_many IS NULL
							OR (
								ra.actor_type_id = 5
								AND (
									ra.other_actor_type IS NULL
									OR TRIM(ra.other_actor_type) = ''
								)
							)
						)
					)
			) > 0 THEN FALSE
			WHEN (
				SELECT
					COUNT(*)
				FROM
					results_by_institution_type rbit
				WHERE
					rbit.results_id = r.id
					AND rbit.is_active = true
					AND rbit.institution_roles_id = 5
					AND (
						rbit.institution_roles_id IS NULL
						OR rbit.institution_types_id IS NULL
						OR (
							rbit.institution_types_id = 78
							AND (
								rbit.other_institution IS NULL
								OR rbit.other_institution = ''
							)
						)
					)
			) > 0 THEN FALSE
			WHEN (
				SELECT
					COUNT(*)
				FROM
					result_ip_measure rim
				WHERE
					rim.result_id = r.id
					AND rim.is_active = TRUE
					AND (
						rim.unit_of_measure IS NULL
						OR rim.quantity IS NULL
					)
			) > 0 THEN FALSE
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

  async innovationDevValidation(resultId: number) {
    const { version } = await this.version();

    const queryData = `
	SELECT
		'innovation-dev-info' as section_name,
		CASE
			WHEN(
				COALESCE(TRIM(rid.short_title), '') <> ''
				AND COALESCE(rid.innovation_characterization_id, 0) > 0
				AND COALESCE(rid.innovation_nature_id, 0) > 0
				AND IF(
					rid.innovation_nature_id = 12,
					rid.is_new_variety is not null,
					true
				)
				AND rid.innovation_user_to_be_determined is not null
				AND IF(
					rid.innovation_user_to_be_determined = 0,
					(
						if(
							(
								SELECT
									1
								FROM 
									result_actors ra
								WHERE
									ra.result_id = r.id
									AND ra.is_active
							) = 1,
							(
								SELECT
									COUNT(*)
								FROM 
									result_actors ra
								WHERE
									ra.result_id = r.id
									AND ra.is_active
									AND COALESCE(TRIM(ra.addressing_demands),'') <> ''
									AND ra.actor_type_id is not null
									AND IF(
										ra.actor_type_id = 5,
										COALESCE(TRIM(ra.other_actor_type), '') <> '',
										TRUE
									)
									AND (
										IF(
											ra.sex_and_age_disaggregation = 1,
											(
												ra.has_women IS NOT NULL
												OR ra.has_women_youth IS NOT NULL
												OR ra.has_men IS NOT NULL
												OR ra.has_men_youth IS NOT NULL
											),
											TRUE
										)
									)
							) > 0,
							TRUE
						)
						AND IF(
							(
								SELECT
									1
								FROM
									results_by_institution_type rbit
								WHERE
									rbit.results_id = r.id
									AND rbit.is_active
							) = 1,
							(
								SELECT
									COUNT(*)
								FROM
									results_by_institution_type rbit
								WHERE
									rbit.results_id = r.id
									AND rbit.is_active
									AND rbit.institution_roles_id = 5
									AND COALESCE(TRIM(rbit.addressing_demands),'') <> ''
									AND rbit.institution_types_id IS NOT NULL
									AND IF(
										rbit.institution_types_id = 78,
										COALESCE(TRIM(rbit.other_institution), '') <> '',
										TRUE
									)
							) > 0,
							TRUE
						)
						AND IF(
							(
								SELECT
									1
								FROM
									result_ip_measure rim
								WHERE
									rim.result_id = r.id
									AND rim.is_active
							) = 1,
							(
								SELECT
									COUNT(*)
								FROM
									result_ip_measure rim
								WHERE
									rim.result_id = r.id
									AND rim.is_active
									AND COALESCE(TRIM(rim.unit_of_measure), '') <> ''
									AND COALESCE(TRIM(rim.addressing_demands),'') <> ''
							) > 0,
							TRUE
						) 
					),
					TRUE
				)
				AND(
					/*(
						# questions 2 and 3 (1 and 2 on front-end)
						(
							# both question 2 and 3 have been answered "answer_boolean = true"
							SELECT
								COUNT(*)
							FROM
								result_questions rq
							LEFT JOIN result_answers ra ON ra.result_question_id = rq.result_question_id
							WHERE
								ra.result_id = r.id
								AND ra.answer_boolean = TRUE
								AND (
									rq.parent_question_id = 2
									OR rq.parent_question_id = 3
								)
						) = 2
						AND (
							SELECT 
								CASE 
									WHEN (
										SELECT COUNT(*) 
										FROM result_answers ra
										WHERE ra.result_id = r.id
											AND ra.result_question_id IN (4, 8)
											AND (ra.answer_boolean IS NULL OR ra.answer_boolean = FALSE)
									) > 0 THEN 1
									WHEN (
										SELECT COUNT(*) 
										FROM result_answers ra
										WHERE ra.result_id = r.id
											AND ra.result_question_id IN (4, 8)
											AND ra.answer_boolean = TRUE
									) > 0 
									AND (
										SELECT COUNT(*) 
										FROM result_answers ra_child
										JOIN result_questions rq_child ON ra_child.result_question_id = rq_child.result_question_id
										WHERE ra_child.result_id = r.id
											AND ra_child.answer_boolean = TRUE
											AND rq_child.parent_question_id IN (4, 8)
									) > 0 THEN 1
									ELSE 0
								END
						)
						AND(
							(
								select 
									count(*) 
								from (
									select distinct 1
									from result_questions rq
									left join result_questions rq_parent 
										on rq.parent_question_id = rq_parent.result_question_id
									left join result_answers ra_parent 
										on ra_parent.result_question_id = rq_parent.result_question_id 
										and ra_parent.is_active
										and coalesce(ra_parent.answer_boolean, 0) = 1
									left join result_answers ra 
										on ra.result_question_id = rq.result_question_id
									where rq.result_question_id = 17 
										and ra.result_id = r.id
										and coalesce(ra.answer_boolean, 0) = 1
										and coalesce(trim(ra.answer_text), '') <> ''
								) as q1
							) = (
								select count(*) 
								from(
									select distinct 1
									from result_questions rq
									left join result_questions rq_parent 
										on rq.parent_question_id = rq_parent.result_question_id
									left join result_answers ra_parent 
										on ra_parent.result_question_id = rq_parent.result_question_id 
										and ra_parent.is_active
										and coalesce(ra_parent.answer_boolean, 0) = 1
									left join result_answers ra 
										on ra.result_question_id = rq.result_question_id
									where rq.result_question_id = 17 
										and ra.result_id = r.id
										and coalesce(ra.answer_boolean, 0) = 1
								) as q2
							)
						)
						AND(
							(
								select 
									count(*) 
								from (
									select distinct 1
									from result_questions rq
									left join result_questions rq_parent 
										on rq.parent_question_id = rq_parent.result_question_id
									left join result_answers ra_parent 
										on ra_parent.result_question_id = rq_parent.result_question_id 
										and ra_parent.is_active
										and coalesce(ra_parent.answer_boolean, 0) = 1
									left join result_answers ra 
										on ra.result_question_id = rq.result_question_id
									where rq.result_question_id = 24 
										and ra.result_id = r.id
										and coalesce(ra.answer_boolean, 0) = 1
										and coalesce(trim(ra.answer_text), '') <> ''
								) as q1
							) = (
								select count(*) 
								from(
									select distinct 1
									from result_questions rq
									left join result_questions rq_parent 
										on rq.parent_question_id = rq_parent.result_question_id
									left join result_answers ra_parent 
										on ra_parent.result_question_id = rq_parent.result_question_id 
										and ra_parent.is_active
										and coalesce(ra_parent.answer_boolean, 0) = 1
									left join result_answers ra 
										on ra.result_question_id = rq.result_question_id
									where rq.result_question_id = 24 
										and ra.result_id = r.id
										and coalesce(ra.answer_boolean, 0) = 1
								) as q2
							)
						)
					)*/
					true AND (
						# validations about question 26 (intellectual rights on front)
						(
							# validate that question 27 have been answered
							SELECT
								COUNT(*)
							FROM
								result_questions rq
							LEFT JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
							WHERE
								ra.result_id = r.id
								AND ra.answer_boolean = TRUE
								AND rq.parent_question_id = 27
						) > 0
						AND (
							# validate that question 28 have been answered if question 30 or 31 have been marked as yes
							IF(
								(
									SELECT 1
									FROM result_questions rq2
									JOIN result_answers ra2 ON rq2.result_question_id = ra2.result_question_id
									WHERE ra2.result_id = r.id
										AND ra2.answer_boolean = TRUE
										AND rq2.result_question_id IN (30, 31)
								) = 1,
								(
									SELECT 
										COUNT(*)
									FROM 
										result_questions rq
									JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
									WHERE 
										ra.result_id = r.id
										AND ra.answer_boolean = TRUE
										AND rq.parent_question_id = 28
								) > 0,
								TRUE
							)
						)
						AND(
							# validate that question 29 have been answered if question 33 or 34 have been marked as yes
							IF(
								(
									SELECT 1
									FROM result_questions rq2
									JOIN result_answers ra2 ON rq2.result_question_id = ra2.result_question_id
									WHERE ra2.result_id = r.id
										AND ra2.answer_boolean = TRUE
										AND rq2.result_question_id IN (33, 34)
								) = 1,
								(
									SELECT 
										COUNT(*)
									FROM 
										result_questions rq
									JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
									WHERE 
										ra.result_id = r.id
										AND ra.answer_boolean = TRUE
										AND rq.parent_question_id = 29
								) > 0,
								TRUE
							)
						)
					)
					AND (
						# validations about question 38 (team diversity on front)
						(
							# validate that question 38 have been answered
							SELECT
								COUNT(*)
							FROM
								result_questions rq
							LEFT JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
							WHERE
								ra.result_id = r.id
								AND ra.answer_boolean = TRUE
								AND rq.parent_question_id = 38
						) > 0
						AND (
							# unique answers for question 39
							(
								SELECT
									COUNT(*)
								FROM
									result_questions rq
								LEFT JOIN result_answers ra ON rq.result_question_id = ra.result_question_id
								WHERE
									ra.result_id = r.id
									AND ra.answer_boolean = TRUE
									AND ra.result_question_id = 39
							) = (
								SELECT
									COUNT(DISTINCT rq.parent_question_id)
								FROM
									result_answers ra
								LEFT JOIN result_questions rq ON rq.result_question_id = ra.result_question_id
								WHERE
									ra.result_id = r.id
									AND ra.answer_boolean = TRUE
									AND rq.parent_question_id = 39
							)
						)
						AND (
							SELECT
								COUNT(*)
							FROM
								result_answers ra
							LEFT JOIN result_questions rq ON rq.result_question_id = ra.result_question_id
							WHERE
								ra.result_id = r.id
								AND ra.result_question_id = 47
								AND (
									coalesce(ra.answer_boolean, 0) = 0
									OR(
										ra.answer_boolean = TRUE
										AND COALESCE(TRIM(ra.answer_text), '') <> ''
									)
								)
						) > 0
					)
				)
				AND rid.innovation_readiness_level_id is not null
				AND IF(
					rid.innovation_readiness_level_id is not null,
					COALESCE(TRIM(rid.evidences_justification), '') <> '',
					true
				)
				AND (
					#budget
					(
						(
							SELECT
								COUNT(*)
							FROM
								results_by_inititiative rbi
							LEFT JOIN result_initiative_budget rib
								ON rib.result_initiative_id = rbi.id
								AND rib.is_active
							WHERE
								rbi.result_id = r.id AND rbi.is_active
								AND IF(
									coalesce(rib.is_determined, 0) = 0,
									COALESCE(rib.kind_cash, 0) > 0,
									TRUE
								)
						) = (
							SELECT
								COUNT(*)
							FROM
								results_by_inititiative rbi
							LEFT JOIN result_initiative_budget rib
								ON rib.result_initiative_id = rbi.id
								AND rib.is_active
							WHERE
								rbi.result_id = r.id AND rbi.is_active
						)
					)
					AND (
						(
							SELECT
								COUNT(*)
							FROM
								non_pooled_project npp
							LEFT JOIN non_pooled_projetct_budget nppb
								ON nppb.non_pooled_projetct_id = npp.id
								AND nppb.is_active
							WHERE
								npp.results_id = r.id AND npp.is_active
								AND IF(
									coalesce(nppb.is_determined, 0) = 0,
									COALESCE(nppb.kind_cash, 0) > 0,
									TRUE
								)
						) = (
							SELECT
								COUNT(*)
							FROM
								non_pooled_project npp
							LEFT JOIN non_pooled_projetct_budget nppb
								ON nppb.non_pooled_projetct_id = npp.id
								AND nppb.is_active
							WHERE
								npp.results_id = r.id AND npp.is_active
						)
					)
					AND (
						(
							SELECT
								COUNT(*)
							FROM
								results_by_institution rbi
							LEFT JOIN result_institutions_budget ribu 
								ON ribu.result_institution_id = rbi.id
								AND ribu.is_active
							WHERE
								rbi.result_id = r.id AND rbi.is_active
								AND IF(
									coalesce(ribu.is_determined, 0) = 0,
									COALESCE(ribu.kind_cash, 0) > 0,
									TRUE
								)
						) = (
							SELECT
								COUNT(*)
							FROM
								results_by_institution rbi
							LEFT JOIN result_institutions_budget ribu 
								ON ribu.result_institution_id = rbi.id
								AND ribu.is_active
							WHERE
								rbi.result_id = r.id AND rbi.is_active
						)
					)
				)
				AND (
					SELECT
						COUNT(*)
					FROM
						evidence e
					WHERE
						e.result_id = r.id
						AND e.evidence_type_id = 4
						AND e.is_active = 1
						AND COALESCE(TRIM(e.link), '') <> ''
				) > 0
			) THEN TRUE
			ELSE FALSE
		END as validation
	FROM
		result r
	LEFT JOIN results_innovations_dev rid on rid.results_id = r.id
		AND rid.is_active > 0
	WHERE
		r.id = ?
		AND r.is_active > 0
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
		\`result\` r
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
    const { version } = await this.version();

    const queryData = `
	SELECT
		'cap-dev-info' as section_name,
		CASE
			WHEN (
				rcd.female_using IS NULL
				OR rcd.male_using IS NULL
				OR non_binary_using IS NULL
				OR rcd.has_unkown_using IS NULL
			) THEN FALSE
			WHEN (
				rcd.capdev_term_id IS NULL
				OR rcd.capdev_term_id = ''
			)
			OR (
				rcd.capdev_delivery_method_id IS NULL
				OR rcd.capdev_delivery_method_id = ''
			)
			OR (rcd.is_attending_for_organization IS NULL) THEN FALSE
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
    const { version } = await this.version();

    const queryData = `
	SELECT
		'policy-change1-info' as section_name,
		CASE
			WHEN (
				(
					SELECT
						COUNT(*)
					FROM
						result_answers ra
					WHERE
						ra.result_id = r.id
						AND ra.is_active > 0
						AND ra.answer_boolean = 1
				) > 0
			)
			AND (
				rpc.policy_type_id is not null
				and rpc.policy_type_id <> ''
			)
			AND (
				rpc.policy_stage_id is not null
				and rpc.policy_stage_id <> ''
			)
			AND (
				(
					SELECT
						count(rbi.id)
					from
						results_by_institution rbi
					where
						rbi.result_id = r.id
						and rbi.institution_roles_id = 4
						and rbi.is_active > 0
				) > 0
			) then TRUE
			else false
		END as validation
	from
		result r
		left join results_policy_changes rpc on rpc.result_id = r.id
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
		IF(r.result_type_id in (4,8,9),1, v.section_seven) *
  		v.general_information *
  		v.theory_of_change *
  		v.partners *
  		v.geographic_location *
  		v.links_to_results *
  		v.evidence as validation
  	from validation v
	  inner join \`result\` r on r.id = v.results_id
	  and r.is_active > 0
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

  async innoReadinessLevel(resultId: number) {
    const { version } = await this.version();

    const innovationDevValidation = `
		SELECT
			cirl.level
		FROM
			results_innovations_dev rid
			LEFT JOIN clarisa_innovation_readiness_level cirl ON cirl.id = rid.innovation_readiness_level_id
			LEFT JOIN result r ON r.id = rid.results_id
		WHERE
			rid.results_id = ?
			AND rid.is_active > 0
			AND r.version_id = ${version};
	`;

    try {
      const innovationDevValidationResult: Array<{ level: number }> =
        await this.dataSource.query(innovationDevValidation, [resultId]);

      return innovationDevValidationResult.length
        ? innovationDevValidationResult[0].level
        : null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: resultValidationRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
