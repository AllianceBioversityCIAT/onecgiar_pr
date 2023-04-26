import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { HandlersError } from "../../../shared/handlers/error.utils";
import { ResultsInnovationPackagesValidationModule } from "./entities/results-innovation-packages-validation-module.entity";
import { GetValidationSectionInnoPckgDto } from "./dto/get-validation-section-inno-pckg.dto";


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
                ) != 0
                OR (
                    SELECT
                        COUNT(*)
                    FROM
                        results_by_institution rbi3
                    WHERE
                        rbi3.result_id = r.id
                        AND rbi3.institution_roles_id = 2
                ) != (
                    SELECT
                        DISTINCT COUNT(*)
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
                        )
                        OR (
                            SELECT
                                COUNT(*)
                            FROM
                                results_center rc
                            WHERE
                                rc.result_id = r.id
                                AND rc.is_active = true
                        ) < 1
                ) THEN FALSE
                ELSE TRUE
            END AS validation
        FROM
            result r
            INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            AND rbi.is_active = 1
        WHERE
            r.is_active = 1
            AND r.id = ?;    
        `

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
} 