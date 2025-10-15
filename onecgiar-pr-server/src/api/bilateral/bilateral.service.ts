import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBilateralDto, SubmittedByDto } from './dto/create-bilateral.dto';
import { ResultRepository } from '../results/result.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Result, SourceEnum } from '../results/entities/result.entity';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ClarisaRegionsRepository } from '../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { Between, In } from 'typeorm';
import { submissionRepository } from '../results/submissions/submissions.repository';
import { ClarisaGeographicScopeRepository } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { ClarisaCountriesRepository } from '../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ClarisaSubnationalScopeRepository } from '../../clarisa/clarisa-subnational-scope/clarisa-subnational-scope.repository';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { Year } from '../results/years/entities/year.entity';
import { YearRepository } from '../results/years/year.repository';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';

@Injectable()
export class BilateralService {

    constructor(
        private readonly _resultRepository: ResultRepository,
        private readonly _handlersError: HandlersError,
        private readonly _versioningService: VersioningService,
        private readonly _userRepository: UserRepository,
        private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
        private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
        private readonly _yearRepository: YearRepository,
        private readonly _submissionRepository: submissionRepository,
        private readonly _geoScopeRepository: ClarisaGeographicScopeRepository,
        private readonly _resultRegionRepository: ResultRegionRepository,
        private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
        private readonly _resultCountryRepository: ResultCountryRepository,
        private readonly _clarisaSubnationalAreasRepository: ClarisaSubnationalScopeRepository,
        private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    ) {}

    async create(bilateralDto: CreateBilateralDto, isAdmin?: boolean, versionId?: number) {
        const userId = 977;

        // === 1. Crear encabezado del Result ===
        const version = await this._versioningService.$_findActivePhase(AppModuleIdEnum.REPORTING);
        if (!version) throw this._handlersError.returnErrorRes({ error: version, debug: true });

        const year = await this._yearRepository.findOne({ where: { active: true } });
        if (!year) throw new NotFoundException('Active year not found');

        const lastCode = await this._resultRepository.getLastResultCode();

        const newResultHeader = await this._resultRepository.save({
            created_by: userId,
            version_id: isAdmin && versionId ? versionId : version.id,
            title: bilateralDto.title,
            description: bilateralDto.description,
            reported_year_id: year.year,
            result_code: lastCode + 1,
            source: SourceEnum.Bilateral,
        });

        // === 2. Guardar submitted_by ===
        const user = await this.findSubmittedByUser(bilateralDto.submitted_by);
        if (!user)
            throw new NotFoundException(
                `User not found (email="${bilateralDto.submitted_by.email || 'N/A'}", date="${bilateralDto.submitted_by.submitted_date || 'N/A'}", name="${bilateralDto.submitted_by.name || 'N/A'}")`,
            );

        await this._submissionRepository.save({
            results_id: newResultHeader.id,
            created_date: bilateralDto.submitted_by.submitted_date,
            user_id: user.id,
            comment: bilateralDto.submitted_by.comment ?? null,
        });

        // === 3. Geo Focus ===
        const { scope_code, scope_label, regions, countries, subnational_areas } = bilateralDto.geo_focus;
        const scope = await this.findScope(scope_code, scope_label);
        this.validateGeoFocus(scope, regions, countries, subnational_areas);

        await this.handleRegions(newResultHeader, scope, regions);
        await this.handleCountries(newResultHeader, countries, scope.id, userId);

        await this._resultRepository.save({
            ...newResultHeader,
            geographic_scope_id: this.resolveScopeId(scope.id, countries),
        });

        // === (Pendiente) Instituciones ===
    }

    private async findSubmittedByUser({ email, submitted_date, name }: SubmittedByDto) {
        if (email) return this._userRepository.findOne({ where: { email } });

        if (submitted_date) {
        const start = new Date(submitted_date);
        const end = new Date(submitted_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return this._userRepository.findOne({ where: { created_date: Between(start, end) } });
        }

        if (name) {
        const [firstName, ...lastParts] = name.trim().split(/\s+/);
        const lastName = lastParts.join(' ') || null;
        const where: any[] = [{ first_name: firstName }];

        if (lastName) {
            where.push({ last_name: lastName }, { first_name: firstName, last_name: lastName });
        }

        return this._userRepository.findOne({ where });
        }

        return null;
    }

    private async findScope(scope_code?: number, scope_label?: string) {
        const where = scope_code ? { code: scope_code } : { name: scope_label };
        const scope = await this._geoScopeRepository.findOne({ where });
        if (!scope) {
            throw new NotFoundException(
                `No geographic scope found for ${scope_code ? `code ${scope_code}` : `label "${scope_label}"`}`,
            );
        }
        return scope;
    }
    
    private validateGeoFocus(scope, regions, countries, subnational_areas) {
        const label = scope.name;

        const validators = {
            2: { field: regions, message: `Regions are required for scope "${label}".` },
            4: { field: countries, message: `Countries are required for scope "${label}".` },
            5: {
                field: countries?.length && subnational_areas?.length,
                message: `Countries and subnational areas are required for scope "${label}".`,
            },
        };

        const validator = validators[scope.code];
        if (validator && !validator.field) throw new BadRequestException(validator.message);
    }

    private async handleRegions(result: Result, scope, regions) {
        const hasRegions = Array.isArray(regions) && regions.length > 0;
        if ((!hasRegions && scope.id !== 2) || scope.id === 3 || scope.id === 4) {
            await this._resultRegionRepository.updateRegions(result.id, []);
            result.has_regions = false;
            return;
        }

        const um49codes = regions.map(r => r.um49code).filter(Boolean);
        const names = regions.map(r => r.name).filter(Boolean);

        const foundRegions = await this._clarisaRegionsRepository.find({
            where: [
                ...(um49codes.length ? [{ um49Code: In(um49codes) }] : []),
                ...(names.length ? [{ name: In(names) }] : []),
            ],
        });

        if (!foundRegions.length) {
            throw new NotFoundException(
                `No regions found matching the provided data (codes: ${um49codes.join(', ') || 'N/A'}, names: ${names.join(', ') || 'N/A'}).`
            );
        }

        const regionIds = foundRegions.map(r => r.um49Code);

        await this._resultRegionRepository.updateRegions(result.id, regionIds);
        const resultRegionArray: ResultRegion[] = [];
        for (const region of foundRegions) {
            const exist = await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
                result.id,
                region.um49Code,
            );

            if (!exist) {
                const newRegion = new ResultRegion();
                newRegion.region_id = region.um49Code;
                newRegion.result_id = result.id;
                resultRegionArray.push(newRegion);
            }
        }

        if (resultRegionArray.length) {
            await this._resultRegionRepository.save(resultRegionArray);
        }

        result.has_regions = true;
        result.geographic_scope_id = [4, 50].includes(scope.id) ? 50 : scope.id;

        await this._resultRepository.save(result);
    }

    private resolveScopeId(scopeId: number, countries?: any[]) {
        if ([4, 50].includes(scopeId)) return 50;
        if (scopeId === 3 && countries) return countries.length > 1 ? 3 : 4;
        return scopeId;
    }

    private async handleCountries(result, countries, scopeId, userId) {
        const hasCountries = Array.isArray(countries) && countries.length > 0;

        // Caso sin países válidos o alcance global/regional sin detalle
        if ((!hasCountries && scopeId !== 3) || scopeId === 4) {
            await this._resultCountryRepository.updateCountries(result.id, []);
            result.has_countries = false;
            return;
        }

        // --- Buscar países en clarisa_countries ---
        const ids = countries.map(r => r.id).filter(Boolean);
        const names = countries.map(r => r.name).filter(Boolean);
        const isoAlpha3s = countries.map(r => r.iso_alpha_3).filter(Boolean);
        const isoAlpha2s = countries.map(r => r.iso_alpha_2).filter(Boolean);

        const whereConditions = [
            ...(ids.length ? [{ id: In(ids) }] : []),
            ...(names.length ? [{ name: In(names) }] : []),
            ...(isoAlpha3s.length ? [{ iso_alpha_3: In(isoAlpha3s) }] : []),
            ...(isoAlpha2s.length ? [{ iso_alpha_2: In(isoAlpha2s) }] : []),
        ];

        const foundCountries = whereConditions.length
            ? await this._clarisaCountriesRepository.find({ where: whereConditions })
            : [];

        if (!foundCountries.length) {
            throw new NotFoundException(
            `No countries found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
            );
        }

        const foundCountryIds = foundCountries.map(c => c.id);

        await this._resultCountryRepository.updateCountries(result.id, foundCountryIds);

        const resultCountryArray = await this.handleResultCountryArray(result, foundCountries);
        await this.handleSubnationals(resultCountryArray, foundCountries, scopeId, userId);

        result.has_countries = true;
    }
    
    private async handleResultCountryArray(result, countries) {
        const resultCountryArray: ResultCountry[] = [];

        for (const c of countries) {
        const exist = await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(result.id, c.id);
        if (!exist) {
            const newCountry = new ResultCountry();
            newCountry.country_id = c.id;
            newCountry.result_id = result.id;
            resultCountryArray.push(newCountry);
         }
        }

        if (resultCountryArray.length) {
            await this._resultCountryRepository.save(resultCountryArray);
        }

        return resultCountryArray;
    }

    private async handleSubnationals(resultCountryArray, countries, geoScopeId, userId) {
        if (geoScopeId !== 5) return;

        const ids = countries.map(r => r.id).filter(Boolean);
        const names = countries.map(r => r.name).filter(Boolean);
        const isoAlpha3s = countries.map(r => r.iso_alpha_3).filter(Boolean);
        const isoAlpha2s = countries.map(r => r.iso_alpha_2).filter(Boolean);

        const whereConditions = [
            ...(ids.length ? [{ id: In(ids) }] : []),
            ...(names.length ? [{ name: In(names) }] : []),
            ...(isoAlpha3s.length ? [{ iso_alpha_3: In(isoAlpha3s) }] : []),
            ...(isoAlpha2s.length ? [{ iso_alpha_2: In(isoAlpha2s) }] : []),
        ];

        const foundCountries = whereConditions.length
            ? await this._clarisaCountriesRepository.find({ where: whereConditions })
            : [];
    }
}