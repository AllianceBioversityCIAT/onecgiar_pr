import { Injectable } from "@nestjs/common";

import { DataSource, Repository } from "typeorm";
import { Ipsr } from "./entities/ipsr.entity";
import { HandlersError } from '../../shared/handlers/error.utils';
import { ResultCountriesSubNational } from '../results/result-countries-sub-national/entities/result-countries-sub-national.entity';


@Injectable()
export class IpsrRepository extends Repository<Ipsr>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(Ipsr, dataSource.createEntityManager())
    }

    async getResultsInnovation(initiativeId: number) {
        const resultInnovationQuery = `
        SELECT
            DISTINCT r.id AS result_id,
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
            rbi.initiative_role_id
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        WHERE
            r.status = 1
            AND r.is_active = 1
            AND rbi.inititiative_id IN (?)
            AND (
                rbi.initiative_role_id = 1 
                OR rbi.initiative_role_id = 2
            )
            AND r.result_type_id = 7
        ORDER BY r.created_date ASC;
        `;

        try {
            const resultInnovation: any[] = await this.dataSource.query(resultInnovationQuery, [initiativeId]);
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
            rbi.inititiative_id,
            ci.official_code AS initiative_official_code,
            ci.short_name AS initiative_short_name,
            ci.name AS initiative_name,
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
            LEFT JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
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
            rc.result_country_id,
            rc.country_id AS id,
            cc.name,
            rc.result_id,
            cc.iso_alpha_2
        FROM result_country rc
            LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id	
        WHERE rc.result_id = ?
            AND rc.is_active = 1;
        `;

        const subNationalQuery = `
        SELECT
        	*
        from
        	result_countries_sub_national rcsn
        WHERE
        	rcsn.result_countries_id in (
        	SELECT
        		rc.result_country_id
        	FROM
        		result_country rc
        	WHERE
        		rc.result_id = ?
        		AND rc.is_active = 1)
        and rcsn.is_active = true;
        `

        const regionsQuery = `
        SELECT
            rr.result_region_id,
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
            const sub_national: ResultCountriesSubNational[] = await this.dataSource.query(subNationalQuery, [resultId]);

            resultInnovation.map(ri => {
                ri['hasRegions'] = regions.filter(r => {
                    return r.result_id === ri.result_id;
                });

                ri['hasCountries'] = countries.filter(c => {
                    return c.result_id === ri.result_id;
                }).map(cid => {
                    cid['result_countries_sub_national'] = sub_national.filter(el => el.result_countries_id == cid['result_country_id']);
                    return cid;
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
            rbip.result_by_innovation_package_id,
        	rbip.result_id,
        	r.result_code,
        	r.title,
        	r.description,
        	rbi.inititiative_id as initiative_id,
        	ci.official_code as initiative_official_code,
            rbi.is_active
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
            and rbip.ipsr_role_id = 2
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

    async getInnovationCoreStepOne(resultId: number) {
        const innovationByIdQuery = `
        SELECT
            rbip.result_id 
        FROM 
            result_by_innovation_package rbip
        WHERE rbip.result_innovation_package_id = ?;
        `;

        const coreInnovationQuery = `
        SELECT
            r.result_code,
            r.title,
            (
                SELECT 
                    ci.official_code 
                FROM 
                    clarisa_initiatives ci
                WHERE ci.id = rbi.inititiative_id 
            ) AS official_code
        FROM
            result r 
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        WHERE r.is_active = 1
            AND rbi.initiative_role_id = 1
            AND r.id = ?;
        `;

        try {
            const innovationById: any[] = await this.dataSource.query(innovationByIdQuery, [resultId]);
            const coreId: number = innovationById[0].result_id
            const coreInnovation: any[] = await this.dataSource.query(coreInnovationQuery, [coreId]);
            return coreInnovation[0];
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: IpsrRepository.name,
                error: error,
                debug: true,
            });
        }
    }

}

export class getInnovationComInterface {
    public result_by_innovation_package_id: number;
    public result_id: number;
    public result_code: number;
    public title: string;
    public short_title: string;
    public description: string;
    public other_funcions: string;
    public initiative_id: number;
    public initiative_official_code: string;
    public is_active: boolean;
    public complementaryFunctions: ComplementaryFunctionsInterface[];
    public referenceMaterials: ReferenceMaterialsInterface[];
}

export interface ComplementaryFunctionsInterface {
    complementary_innovation_functions_id: number;
}
export interface ReferenceMaterialsInterface {
    link: string;
}