import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { HandlersError } from "../../../shared/handlers/error.utils";
import { ResultsInnovationPackagesValidationModule } from "./entities/results-innovation-packages-validation-module.entity";
import { GetValidationSectionInnoPckgDto } from "./dto/get-validation-section-inno-pckg.dto";
import { BooleanModel } from "aws-sdk/clients/gamelift";


@Injectable()
export class ResultsInnovationPackagesValidationModuleRepository extends Repository<ResultsInnovationPackagesValidationModule> {
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ResultsInnovationPackagesValidationModule, dataSource.createEntityManager());
    }

    async generalInformation(resultId: number) {
        const giQuery = `
        SELECT
            'General Information' as sectionName,
            CASE 
                WHEN 
                    r.title IS NULL OR r.title = '' OR
                    r.description IS NULL OR r.description = '' OR
                    r.lead_contact_person IS NULL OR r.lead_contact_person = '' OR
                    r.gender_tag_level_id IS NULL OR
                    r.climate_change_tag_level_id IS NULL
                THEN FALSE
                ELSE TRUE
            END AS validation
        FROM result r
        WHERE r.is_active = true
            AND r.id = ?;
        `;

        try {
            const generalInformation: GetValidationSectionInnoPckgDto[] = await this.query(giQuery, [resultId]);
            console.log("🚀 ~ file: results-innovation-packages-validation-module.repository.ts:38 ~ ResultsInnovationPackagesValidationModuleRepository ~ generalInformation ~ generalInformation:", generalInformation)
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
                        AND rtr1.planned_result IS NOT NULL
                        AND rtr1.initiative_id = rbi.inititiative_id
                        AND rbi.initiative_role_id = 1
                ) = 0
                OR (
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
                ) != 0 THEN FALSE
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
            AND r.id = ?;
        `;

        try {
            const contributors: GetValidationSectionInnoPckgDto[] = await this.query(contributorsQuery, [resultId]);
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
                WHEN r.geographic_scope_id IS NULL
                OR r.geographic_scope_id = 0 THEN FALSE
                WHEN r.geographic_scope_id = 2
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_region rr
                    WHERE
                        rr.result_id = r.id
                        AND rr.is_active = true
                ) = 0 THEN FALSE
                WHEN r.geographic_scope_id = 3
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_country rc
                    WHERE
                        rc.result_id = r.id
                        AND rc.is_active = true
                ) = 0 THEN FALSE
                WHEN r.geographic_scope_id = 4
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        result_country rc
                    WHERE
                        rc.result_id = r.id
                        AND rc.is_active = true
                ) = 0 THEN FALSE
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
                    SELECT
                        COUNT(*)
                    FROM
                        result_actors ra
                    WHERE
                        ra.result_id = r.id
                        AND ra.is_active = true
                        AND ra.women IS NOT NULL
                        AND ra.women_youth IS NOT NULL
                        AND ra.men IS NOT NULL
                        AND ra.men_youth IS NOT NULL
                ) = 0
                AND (
                    SELECT
                        COUNT(*)
                    FROM
                        results_by_institution_type rbit
                    WHERE
                        rbit.results_id = r.id
                        AND rbit.is_active = true
                        AND rbit.institution_roles_id IS NOT NULL
                        AND rbit.institution_types_id IS NOT NULL
                        AND rbit.how_many IS NOT NULL
                ) = 0 THEN FALSE
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM
                        result_ip_measure rim
                    WHERE
                        rim.result_ip_id = r.id
                        AND rim.is_active = TRUE
                ) = 0 THEN FALSE
                WHEN (
                    SELECT
                        COUNT(*)
                    FROM
                        results_by_institution rbi
                    WHERE
                        rbi.result_id = r.id
                        AND rbi.institution_roles_id = 5
                        AND rbi.is_active = TRUE
                ) != (
                    SELECT
                        DISTINCT COUNT(*)
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
                        AND rie.last_name IS NOT NULL
                        AND rie.email IS NOT NULL
                        AND rie.organization_id IS NOT NULL
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
                        rie3.result_ip_expert_id
                    FROM
                        result_ip_expert rie3
                    WHERE
                        rie3.result_id = r.id
                        AND (
                            rie3.first_name IS NULL
                            OR rie3.last_name IS NULL
                            OR rie3.email IS NULL
                            OR rie3.organization_id IS NULL
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
            const stepOne: GetValidationSectionInnoPckgDto[] = await this.query(stepOneQuery, [resultId]);
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
            const [stepTwoOne, stepTwoTwo]: GetValidationSectionInnoPckgDto[][] = await Promise.all(
                [
                    this.query(stepTwoOneQuery, [resultId]),
                    this.query(stepTwoTwoQuery, [resultId]),
                ]
            );

            const stepTwoValidation = stepTwoOne[0].validation && stepTwoTwo[0].validation;

            return {
                step: '2',
                sectionName: 'Step 2',
                validation: stepTwoValidation,
                stepSubSections: [stepTwoOne[0], stepTwoTwo[0]]
            };
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: ResultsInnovationPackagesValidationModuleRepository.name,
                error: error, debug: true,
            });
        }

    }
} 