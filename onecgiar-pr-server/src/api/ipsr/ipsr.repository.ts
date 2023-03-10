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
            AND r.result_type_id = 2;
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
            r.is_krs,
            r.krs_url
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
            LEFT JOIN innovation_by_result ibr ON ibr.ipsr_result_id = r.id
        WHERE
            r.is_active = 1
            AND r.id = ibr.ipsr_result_id
            AND rbi.is_active = 1
            AND rbi.initiative_role_id = 1
        ORDER BY
            r.result_code ASC;
        `;

        try {
            const getAllInnovationPackages: any[] = 
                await this.dataSource.query(innovationPackagesQuery);
            return getAllInnovationPackages;
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }
}