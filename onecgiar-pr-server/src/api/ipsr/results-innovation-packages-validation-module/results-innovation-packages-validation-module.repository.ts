import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInnovationPackagesValidationModule } from './entities/results-innovation-packages-validation-module.entity';
import { GetValidationSectionInnoPckgDto } from './dto/get-validation-section-inno-pckg.dto';

@Injectable()
export class ResultsInnovationPackagesValidationModuleRepository extends Repository<ResultsInnovationPackagesValidationModule> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(
      ResultsInnovationPackagesValidationModule,
      dataSource.createEntityManager(),
    );
  }

  async generalInformation(resultId: number) {
    const giQuery = `
    SELECT
        'general-information' as sectionName,
        CASE
            WHEN r.title IS NULL
            OR r.title = ''
            OR r.description IS NULL
            OR r.description = ''
            OR (
                r.lead_contact_person IS NULL
                OR r.lead_contact_person = ''
            )
            OR (
                r.gender_tag_level_id IS NULL
                OR r.gender_tag_level_id = 0
            )
            OR (
                r.climate_change_tag_level_id IS NULL
                OR r.climate_change_tag_level_id = 0
            )
            OR (
                r.gender_tag_level_id = 3
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        evidence e
                    WHERE
                        e.result_id = r.id
                        AND e.gender_related
                        AND e.is_active = 1
                ) = 0
            )
            OR (
                r.climate_change_tag_level_id = 3
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        evidence e
                    WHERE
                        e.result_id = r.id
                        AND e.youth_related
                        AND e.is_active = 1
                ) = 0
            ) THEN FALSE
            ELSE TRUE
        END AS validation
    FROM
        result r
    WHERE
        r.is_active = true
        AND r.id = ?;
        `;

    try {
      const generalInformation: GetValidationSectionInnoPckgDto[] =
        await this.query(giQuery, [resultId]);
      return generalInformation[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationPackagesValidationModuleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async contributors(resultId: number) {
    const contributorsQuery = `
    SELECT
        'Contributors' as sectionName,
        CASE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    results_toc_result rtr1
                WHERE
                    rtr1.results_id = r.id
                    AND rtr1.initiative_id = rbi.inititiative_id
                    AND rbi.initiative_role_id = 1
                    AND rtr1.is_active = 1
                    AND (
                        rtr1.planned_result IS NULL
                        OR rtr1.toc_result_id IS NULL
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    results_toc_result rtr2
                WHERE
                    rtr2.results_id = r.id
                    AND rtr2.planned_result IS NOT NULL
                    AND rtr2.initiative_id IN (
                        SELECT
                            rbi2.inititiative_id
                        FROM
                            results_by_inititiative rbi2
                        WHERE
                            rbi2.result_id = r.id
                            AND rbi2.initiative_role_id = 2
                            AND rbi2.is_active = true
                    )
                    AND (
                        rtr2.planned_result IS NULL
                        OR rtr2.toc_result_id IS NULL
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    results_by_institution rbi3
                WHERE
                    rbi3.result_id = r.id
                    AND rbi3.institution_roles_id = 2
                    AND rbi3.is_active = TRUE
            ) != (
                SELECT
                    COUNT(DISTINCT rbibdt.result_by_institution_id)
                FROM
                    result_by_institutions_by_deliveries_type rbibdt
                WHERE
                    rbibdt.is_active = true
                    AND rbibdt.result_by_institution_id IN (
                        SELECT
                            rbi4.id
                        FROM
                            results_by_institution rbi4
                        WHERE
                            rbi4.result_id = r.id
                            AND rbi4.institution_roles_id = 2
                            AND rbi4.is_active = true
                    )
            ) THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    results_center rc
                WHERE
                    rc.result_id = r.id
                    AND rc.is_active = true
            ) < 1 THEN FALSE
            ELSE TRUE
        END AS validation
    FROM
        result r
        INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        AND rbi.is_active = 1
    WHERE
        r.is_active = 1
        AND rbi.initiative_role_id = 1
        AND r.id = ?;
        `;

    try {
      const contributors: GetValidationSectionInnoPckgDto[] = await this.query(
        contributorsQuery,
        [resultId],
      );
      return contributors[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationPackagesValidationModuleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async stepOne(resultId: number) {
    const stepOneQuery = `
    SELECT
        1 AS step,
        'Step 1' AS sectionName,
        CASE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_eoi_outcomes rieo
                WHERE
                    rieo.result_by_innovation_package_id = rbip.result_by_innovation_package_id
                    AND rieo.is_active = true
            ) = 0
            OR (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_action_area_outcome riaao
                WHERE
                    riaao.result_by_innovation_package_id = rbip.result_by_innovation_package_id
                    AND riaao.is_active = true
            ) = 0
            OR (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_impact_area_target riiat
                WHERE
                    riiat.result_by_innovation_package_id = rbip.result_by_innovation_package_id
                    AND riiat.is_active = 1
            ) = 0
            OR (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_sdg_targets rist
                WHERE
                    rist.result_by_innovation_package_id = rbip.result_by_innovation_package_id
                    AND rist.is_active = 1
            ) = 0 THEN FALSE
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
                                AND ra.how_many IS NOT NULL
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
                        AND (
                            (
                                rbit.institution_types_id != 78
                                AND(
                                    rbit.institution_roles_id IS NOT NULL
                                    AND rbit.institution_types_id IS NOT NULL
                                    AND rbit.how_many IS NOT NULL
                                )
                            )
                            OR (
                                rbit.institution_types_id = 78
                                AND (
                                    rbit.other_institution IS NOT NULL
                                    OR rbit.other_institution != ''
                                    AND rbit.institution_roles_id IS NOT NULL
                                    AND rbit.institution_types_id IS NOT NULL
                                    AND rbit.how_many IS NOT NULL
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
                        AND rim.quantity IS NOT NULL
                ) = 0
            ) THEN FALSE
            WHEN(
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
                                OR ra.women_youth IS NULL
                                OR ra.men IS NULL
                                OR ra.men_youth IS NULL
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
            WHEN(
                SELECT
                    COUNT(*)
                FROM
                    results_by_institution_type rbit
                WHERE
                    rbit.results_id = r.id
                    AND rbit.is_active = true
                    AND (
                        rbit.institution_roles_id IS NULL
                        OR rbit.institution_types_id IS NULL
                        OR rbit.how_many IS NULL
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
            WHEN (
                SELECT
                    COUNT(rbi.id)
                FROM
                    results_by_institution rbi
                WHERE
                    rbi.result_id = r.id
                    AND rbi.institution_roles_id = 5
                    AND rbi.is_active = TRUE
            ) != (
                SELECT
                    COUNT(DISTINCT rbibdt.result_by_institution_id)
                FROM
                    result_by_institutions_by_deliveries_type rbibdt
                WHERE
                    rbibdt.is_active = true
                    AND rbibdt.result_by_institution_id IN (
                        SELECT
                            rbi2.id
                        FROM
                            results_by_institution rbi2
                        WHERE
                            rbi2.result_id = r.id
                            AND rbi2.institution_roles_id = 5
                            AND rbi2.is_active = TRUE
                    )
            ) THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_expert rie
                WHERE
                    rie.is_active = TRUE
                    AND rie.result_id = r.id
                    AND rie.first_name IS NOT NULL
                    AND rie.first_name <> ''
                    AND rie.last_name IS NOT NULL
                    AND rie.last_name <> ''
                    AND rie.result_ip_expert_id IN (
                        SELECT
                            rie2.result_ip_expert_id
                        FROM
                            result_ip_expertises rie2
                        WHERE
                            rie2.result_ip_expert_id = rie.result_ip_expert_id
                            AND rie2.is_active = true
                    )
            ) = 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_expert rie3
                WHERE
                    rie3.result_id = r.id
                    AND rie3.is_active = TRUE
                    AND (
                        rie3.first_name IS NULL
                        OR rie3.last_name IS NULL
                        OR rie3.first_name = ''
                        OR rie3.last_name = ''
                        OR NOT EXISTS (
                            SELECT
                                rie4.result_ip_expert_id
                            FROM
                                result_ip_expertises rie4
                            WHERE
                                rie4.result_ip_expert_id = rie3.result_ip_expert_id
                                AND rie4.is_active = true
                        )
                    )
            ) > 1 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_innovation_package rip
                WHERE
                    result_innovation_package_id = r.id
                    AND is_active = TRUE
                    AND (
                        rip.experts_is_diverse IS NULL
                        OR (
                            rip.experts_is_diverse = FALSE
                            AND rip.is_not_diverse_justification IS NULL
                        )
                    )
            ) = 1 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_innovation_package rip
                WHERE
                    rip.result_innovation_package_id = r.id
                    AND rip.is_active = TRUE
                    AND (
                        rip.consensus_initiative_work_package_id IS NULL
                        OR rip.relevant_country_id IS NULL
                        OR rip.regional_leadership_id IS NULL
                        OR rip.regional_integrated_id IS NULL
                        OR rip.active_backstopping_id IS NULL
                    )
            ) = 1 THEN FALSE
            ELSE TRUE
        END AS validation
    FROM
        result r
        LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = r.id
        AND rbip.ipsr_role_id = 1
    WHERE
        r.is_active = 1
        AND r.id = ?;
        `;

    try {
      const stepOne: GetValidationSectionInnoPckgDto[] = await this.query(
        stepOneQuery,
        [resultId],
      );
      return stepOne[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationPackagesValidationModuleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async stepTwo(resultId: number) {
    const stepTwoOneQuery = `
        SELECT
            2.1 AS subSection,
            'Step 2.1' AS sectionName,
            CASE 
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM result_by_innovation_package rbip 
                    WHERE rbip.is_active = TRUE 
                        AND rbip.ipsr_role_id = 2
                        AND rbip.result_innovation_package_id = r.id
                ) = 0 THEN FALSE
                ELSE TRUE
            END AS validation
        FROM
            result r
            LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = 4594
            AND rbip.ipsr_role_id = 1
        WHERE
            r.is_active = 1
            AND r.id = ?;
        `;

    const stepTwoTwoQuery = `
        SELECT
            2.2 AS subSection,
            'Step 2.2' AS sectionName,
            CASE 
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM result_by_innovation_package rbip 
                    WHERE rbip.is_active = TRUE 
                        AND rbip.ipsr_role_id = 2
                        AND rbip.result_innovation_package_id = r.id
                ) = 0 THEN FALSE
                ELSE TRUE
            END AS validation
        FROM
            result r
            LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = 4594
            AND rbip.ipsr_role_id = 1
        WHERE
            r.is_active = 1
            AND r.id = ?;
        `;

    try {
      const [stepTwoOne, stepTwoTwo]: GetValidationSectionInnoPckgDto[][] =
        await Promise.all([
          this.query(stepTwoOneQuery, [resultId]),
          this.query(stepTwoTwoQuery, [resultId]),
        ]);

      const stepTwoValidation =
        stepTwoOne[0].validation && stepTwoTwo[0].validation;

      return {
        step: '2',
        sectionName: 'Step 2',
        validation: stepTwoValidation,
        stepSubSections: [stepTwoOne[0]],
      };
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationPackagesValidationModuleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async stepThree(resultId: number) {
    const stepThreeQuery = `
    SELECT
        3 AS step,
        'Step 3' AS sectionName,
        CASE
            WHEN rip.is_expert_workshop_organized IS NULL THEN FALSE
            WHEN (
                rip.is_expert_workshop_organized = 1
                AND rip.assessed_during_expert_workshop_id IS NULL
            ) THEN FALSE
            WHEN (
                rip.is_expert_workshop_organized = 1
                AND (
                    rip.assessed_during_expert_workshop_id = 1
                    AND (
                        SELECT
                            COUNT(*)
                        FROM
                            result_by_innovation_package rbip
                        WHERE
                            rbip.result_innovation_package_id = r.id
                            AND rbip.is_active = TRUE
                            AND (
                                rbip.current_innovation_readiness_level IS NULL
                                OR rbip.current_innovation_use_level IS NULL
                            )
                    ) > 0
                )
            ) THEN FALSE
            WHEN (
                rip.is_expert_workshop_organized = 1
                AND (
                    rip.assessed_during_expert_workshop_id = 2
                    AND (
                        SELECT
                            COUNT(*)
                        FROM
                            result_by_innovation_package rbip
                        WHERE
                            rbip.result_innovation_package_id = r.id
                            AND rbip.is_active = TRUE
                            AND (
                                rbip.current_innovation_readiness_level IS NULL
                                OR rbip.current_innovation_use_level IS NULL
                                OR rbip.potential_innovation_readiness_level IS NULL
                                OR rbip.potential_innovation_use_level IS NULL
                            )
                    ) > 0
                )
            ) THEN FALSE
            WHEN (
                (
                    rbip.readiness_level_evidence_based IS NULL
                    OR rbip.readiness_level_evidence_based = ''
                )
                AND (
                    rbip.use_level_evidence_based IS NULL
                    OR rbip.use_level_evidence_based = ''
                )
            )
            OR (
                (
                    (
                        SELECT
                            cirl.level
                        FROM
                            clarisa_innovation_readiness_level cirl
                        WHERE
                            cirl.id = rbip.readiness_level_evidence_based
                    ) != 0
                    AND (
                        rbip.readinees_evidence_link IS NULL
                        OR rbip.readinees_evidence_link = ''
                    )
                )
                OR (
                    (
                        SELECT
                            ciul.level
                        FROM
                            clarisa_innovation_use_levels ciul
                        WHERE
                            ciul.id = rbip.use_level_evidence_based
                    ) != 0
                    AND (
                        rbip.use_evidence_link IS NULL
                        OR rbip.use_evidence_link = ''
                    )
                )
            ) THEN FALSE
            WHEN (
                (
                    SELECT
                        ciul.level
                    FROM
                        clarisa_innovation_use_levels ciul
                    WHERE
                        ciul.id = rbip.use_level_evidence_based
                ) != 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_result_actors rira
                    WHERE
                        rira.result_ip_result_id = rbip.result_by_innovation_package_id
                        AND rira.is_active = TRUE
                        AND (
                            (
                                rira.sex_and_age_disaggregation = 0
                                AND (
                                    rira.actor_type_id IS NOT NULL
                                    AND rira.women IS NOT NULL
                                    AND rira.women_youth IS NOT NULL
                                    AND rira.men IS NOT NULL
                                    AND rira.men_youth IS NOT NULL
                                    AND rira.evidence_link IS NOT NULL
                                    AND rira.evidence_link != ''
                                    OR (
                                        rira.actor_type_id = 5
                                        AND (
                                            rira.other_actor_type IS NOT NULL
                                            OR TRIM(rira.other_actor_type) <> ''
                                        )
                                    )
                                )
                            )
                            OR (
                                rira.sex_and_age_disaggregation = 1
                                AND (
                                    rira.actor_type_id IS NOT NULL
                                    AND rira.evidence_link IS NOT NULL
                                    AND rira.evidence_link != ''
                                    AND rira.how_many IS NOT NULL
                                    OR (
                                        rira.actor_type_id = 5
                                        AND (
                                            rira.other_actor_type IS NOT NULL
                                            AND TRIM(rira.other_actor_type) <> ''
                                        )
                                    )
                                )
                            )
                        )
                ) = 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_result_institution_types ririt
                    WHERE
                        ririt.result_ip_results_id = rbip.result_by_innovation_package_id
                        AND ririt.is_active = TRUE
                        AND (
                            ririt.institution_types_id != 78
                            AND (
                                ririt.institution_types_id IS NOT NULL
                                AND ririt.institution_roles_id IS NOT NULL
                                AND ririt.how_many IS NOT NULL
                                AND (
                                    ririt.evidence_link IS NOT NULL
                                    OR ririt.evidence_link != ''
                                )
                            )
                            OR (
                                ririt.institution_types_id = 78
                                AND (
                                    ririt.other_institution IS NOT NULL
                                    OR ririt.other_institution != ''
                                )
                            )
                        )
                ) = 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_result_measures rirm
                    WHERE
                        rirm.result_ip_result_id = rbip.result_by_innovation_package_id
                        AND rirm.is_active = TRUE
                        AND (
                            rirm.unit_of_measure IS NOT NULL
                            AND rirm.quantity IS NOT NULL
                            AND rirm.evidence_link IS NOT NULL
                        )
                ) = 0
            ) THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_result_actors rira
                WHERE
                    rira.result_ip_result_id = rbip.result_by_innovation_package_id
                    AND rira.is_active = TRUE
                    AND (
                        (
                            rira.sex_and_age_disaggregation = 0
                            AND (
                                rira.actor_type_id IS NULL
                                OR rira.women IS NULL
                                OR rira.women_youth IS NULL
                                OR rira.men IS NULL
                                OR rira.men_youth IS NULL
                                OR rira.evidence_link IS NULL
                                OR rira.evidence_link = ''
                                OR (
                                    rira.actor_type_id = 5
                                    AND (
                                        rira.other_actor_type IS NULL
                                        OR TRIM(rira.other_actor_type) = ''
                                    )
                                )
                            )
                        )
                        OR (
                            rira.sex_and_age_disaggregation = 1
                            AND (
                                rira.actor_type_id IS NULL
                                OR rira.evidence_link IS NULL
                                OR rira.evidence_link = ''
                                OR rira.how_many IS NULL
                                OR (
                                    rira.actor_type_id = 5
                                    AND (
                                        rira.other_actor_type IS NULL
                                        OR TRIM(rira.other_actor_type) = ''
                                    )
                                )
                            )
                        )
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_result_institution_types ririt
                WHERE
                    ririt.result_ip_results_id = rbip.result_by_innovation_package_id
                    AND ririt.is_active = TRUE
                    AND (
                        institution_types_id IS NULL
                        OR institution_roles_id IS NULL
                        OR ririt.how_many IS NULL
                        OR ririt.evidence_link IS NULL
                        OR ririt.evidence_link = ''
                        OR ririt.institution_types_id IS NULL
                        OR ririt.institution_types_id IS NULL
                        OR (
                            ririt.institution_types_id = 78
                            AND (
                                ririt.other_institution IS NULL
                                OR ririt.other_institution = ''
                            )
                        )
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_ip_result_measures rirm
                WHERE
                    rirm.result_ip_result_id = rbip.result_by_innovation_package_id
                    AND rirm.is_active = TRUE
                    AND (
                        rirm.unit_of_measure IS NULL
                        OR rirm.quantity IS NULL
                    )
            ) > 0 THEN FALSE
            WHEN (
                SELECT
                    COUNT(*)
                FROM
                    result_by_innovation_package rbip2
                    LEFT JOIN clarisa_innovation_readiness_level cirl2 ON cirl2.id = rbip2.readiness_level_evidence_based
                    LEFT JOIN clarisa_innovation_use_levels ciul2 ON ciul2.id = rbip2.use_level_evidence_based
                WHERE
                    rbip2.is_active = TRUE
                    AND rbip2.ipsr_role_id = 2
                    AND rbip2.result_innovation_package_id = r.id
                    AND (
                        (
                            (
                                cirl2.level != 0
                                OR cirl2.level IS NULL
                            )
                            AND (
                                rbip2.readinees_evidence_link IS NULL
                                OR rbip2.readinees_evidence_link = ''
                            )
                        )
                        OR (
                            (
                                ciul2.level != 0
                                OR ciul2.level IS NULL
                            )
                            AND(
                                rbip2.use_evidence_link IS NULL
                                OR rbip2.use_evidence_link = ''
                            )
                        )
                    )
            ) > 0 THEN FALSE
            ELSE TRUE
        END AS validation
    FROM
        result r
        LEFT JOIN result_innovation_package rip ON rip.result_innovation_package_id = r.id
        LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = rip.result_innovation_package_id
        AND rbip.ipsr_role_id = 1
    WHERE
        r.is_active = 1
        AND r.id = ?;
        `;

    try {
      const stepThree: GetValidationSectionInnoPckgDto[] = await this.query(
        stepThreeQuery,
        [resultId],
      );
      return stepThree[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationPackagesValidationModuleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async stepFour(resultId: number) {
    const stepFourQuery = `
        SELECT
            4 AS step,
            'Step 4' AS sectionName,
            CASE
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM
                        result_initiative_budget ripb
                    WHERE
                        result_initiative_id IN (
                            SELECT
                                rbi.id
                            FROM
                                results_by_inititiative rbi
                            WHERE
                                rbi.is_active = 1
                                AND rbi.result_id = r.id
                        )
                        AND is_active = TRUE
                        AND (
                            ripb.is_determined != 1
                            OR ripb.is_determined IS NULL
                        )
                        AND(
                            ripb.current_year IS NULL
                            OR ripb.current_year = 0
                            OR ripb.next_year IS NULL
                            OR ripb.next_year = 0
                        )
                ) > 0 THEN FALSE
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM
                        non_pooled_projetct_budget nppb
                    WHERE
                        nppb.non_pooled_projetct_id IN (
                            SELECT
                                npp.id
                            FROM
                                non_pooled_project npp
                            WHERE
                                npp.is_active = 1
                                AND npp.results_id = r.id
                        )
                        AND nppb.is_active = 1
                        AND (
                            nppb.is_determined != 1
                            OR nppb.is_determined IS NULL
                        )
                        AND(
                            nppb.in_kind IS NULL
                            OR nppb.in_kind = 0
                            OR nppb.in_cash IS NULL
                            OR nppb.in_cash = 0
                        )
                ) > 0 THEN FALSE
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM
                        result_institutions_budget ribu
                    WHERE
                        ribu.result_institution_id IN (
                            SELECT
                                rbi.id
                            FROM
                                results_by_institution rbi
                            WHERE
                                rbi.is_active = 1
                                AND rbi.result_id = r.id
                        )
                        AND ribu.is_active = 1
                        AND (
                            ribu.is_determined != 1
                            OR ribu.is_determined IS NULL
                        )
                        AND (
                            ribu.in_kind IS NULL
                            OR ribu.in_kind = 0
                            OR ribu.in_cash IS NULL
                            OR ribu.in_cash = 0
                        )
                ) > 0 THEN FALSE
                WHEN rip.is_result_ip_published IS NULL THEN FALSE
                ELSE TRUE
            END AS validation
        FROM
            result r
            LEFT JOIN result_innovation_package rip ON rip.result_innovation_package_id = r.id
        WHERE
            r.is_active = 1
            AND r.id = ?;
        `;

    try {
      const stepFour: GetValidationSectionInnoPckgDto[] = await this.query(
        stepFourQuery,
        [resultId],
      );
      return stepFour[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationPackagesValidationModuleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  links = () => {
    return {
      sectionName: 'Link to results',
      validation: '1',
    };
  };
}
