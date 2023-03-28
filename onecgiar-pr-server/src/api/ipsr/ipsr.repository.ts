import { Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { Ipsr } from "./entities/ipsr.entity";


@Injectable()
export class IpsrRepository extends Repository<Ipsr>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(Ipsr, dataSource.createEntityManager())
    }

    async getResultsInnovation() {
        const resultInnovationQuery = `
        SELECT
            r.id AS result_id,
            r.result_code,
            r.title,
            r.description,
            rbi.inititiative_id AS initiative_id,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code,
            r.created_date AS creation_date,
            (
                SELECT
                    rt.name
                FROM
                    result_type rt
                WHERE
                    rt.id = r.result_type_id
            ) AS innovation_type
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        WHERE
            r.status = 1
            AND r.is_active = 1
            AND rbi.initiative_role_id = 1
            AND r.result_type_id = 7;
        `;

        try {
            const resultInnovation: any[] = await this.dataSource.query(resultInnovationQuery);
            return resultInnovation;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async getResultInnovationDetail(resultId: number) {
        const resultInnovationByIdQuery = `
        SELECT
            r.id AS result_id,
            r.result_code,
            r.title,
            (
                SELECT
                    CONCAT(ci.official_code, ' - ', ci.short_name)
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code,
            (
                SELECT
                    rl.name
                FROM
                    result_level rl
                WHERE
                    rl.id = r.result_level_id
            ) AS result_level,
            (
                SELECT
                    rt.name
                FROM
                    result_type rt
                WHERE
                    rt.id = r.result_type_id
            ) AS result_type
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id
        WHERE
            r.is_active = 1
            AND r.id = ?;
        `;

        try {
            const resultInnovation: any[] = await this.dataSource.query(resultInnovationByIdQuery, [resultId]);

            return resultInnovation[0];
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async getResultInnovationById(resultId: number) {
        const resultInnovationByIdQuery = `
        SELECT
            r.id AS result_id,
            r.result_code,
            r.title,
            r.description,
            rbi.inititiative_id AS initiative_id,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code,
            r.created_date AS creation_date,
            (
                SELECT
                    rt.name
                FROM
                    result_type rt
                WHERE
                    rt.id = r.result_type_id
            ) AS innovation_type,
            r.geographic_scope_id,
            cgs.name AS geoscope,
            r.gender_tag_level_id,
            (
                SELECT
                    gtl.title
                FROM
                    gender_tag_level gtl
                WHERE
                    gtl.id = r.gender_tag_level_id
            ) AS gender_tag_level,
            r.climate_change_tag_level_id,
            (
                SELECT
                    gtl2.title
                FROM
                    gender_tag_level gtl2
                WHERE
                    gtl2.id = r.climate_change_tag_level_id
            ) AS climate_tag_level,
            IF((r.is_krs = 1), true, false ) AS is_krs,
            r.krs_url,
            r.lead_contact_person,
            r.reported_year_id
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id
        WHERE r.is_active = 1
            AND r.id = ?;
        `;

        const countryQuery = `
        SELECT
            rc.country_id AS id,
            cc.name,
            rc.result_id
        FROM result_country rc
            LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id	
        WHERE rc.result_id = ?
            AND rc.is_active = 1;
        `;

        const regionsQuery = `
        SELECT
            rr.region_id AS id,
            cr.name,
            rr.result_id
        FROM result_region rr
            LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
        WHERE rr.result_id = ?
            AND rr.is_active = 1;
        `;

        try {
            const resultInnovation: any[] = await this.dataSource.query(resultInnovationByIdQuery, [resultId]);
            const regions: any[] = await this.dataSource.query(regionsQuery, [resultId]);
            const countries: any[] = await this.dataSource.query(countryQuery, [resultId]);

            resultInnovation.map(ri => {
                ri['hasRegions'] = regions.filter(r => {
                    return r.result_id === ri.result_id;
                });

                ri['hasCountries'] = countries.filter(c => {
                    return c.result_id === ri.result_id;
                });
            });

            return [resultInnovation[0]];
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async getAllInnovationPackages() {
        const innovationPackagesQuery = `
        SELECT
            DISTINCT r.id,
            r.result_code,
            r.title,
            IF((r.status = 1), 'Submitted', 'Editing') AS status,
            r.reported_year_id,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN result_by_innovation_package ibr ON ibr.result_innovation_package_id = r.id
        WHERE
            r.is_active = 1
            AND r.id = ibr.result_innovation_package_id
            AND rbi.is_active = 1
            AND rbi.initiative_role_id = 1
        ORDER BY
            r.result_code ASC;
        `;

        try {
            const getAllInnovationPackages: any[] = await this.dataSource.query(innovationPackagesQuery);
            return getAllInnovationPackages;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }

    async getStepTwoOne(resultId: number) {
        const query = `
        SELECT
        	rbip.result_id,
        	r.result_code,
        	r.title,
        	r.description,
        	rbi.inititiative_id,
        	ci.official_code
        FROM
        	result_by_innovation_package rbip
        inner join \`result\` r on
        	r.id = rbip.result_id
        	and r.is_active = true
        left join results_by_inititiative rbi on
        	rbi.result_id = r.id
        	and rbi.initiative_role_id = 1
        	and rbi.is_active = true
        left join clarisa_initiatives ci on
        	ci.id = rbi.inititiative_id
        where
        	rbip.result_innovation_package_id = ?
        	and rbip.is_active = true;
        `;

        try {
            const results: getInnovationComInterface[] = await this.query(query, [resultId]);
            return results;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }

}

export interface getInnovationComInterface{
    result_id: number;
    result_code: number;
    title: string;
    description: string;
    inititiative_id: number;
    official_code:string;
}