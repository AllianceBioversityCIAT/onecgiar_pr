import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import axios from 'axios';
import { ClarisaMeliaStudyTypeRepository } from './clarisa-melia-study-type/ClariasaMeliasStudyType.repository';
import { ClariasaActionAreaRepository } from './clarisa-action-areas/ClariasaActionArea.repository';
import { ClarisaInitiativesRepository } from './clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaImpactAreaRepository } from './clarisa-impact-area/ClarisaImpactArea.repository';
import { ClarisaImpactAreaInticatorsRepository } from './clarisa-impact-area-indicators/ClarisaImpactAreaIndicators.repository';
import { ClarisaCountry } from './clarisa-countries/entities/clarisa-country.entity';
import { ClarisaOutcomeIndicatorsRepository } from './clarisa-outcome-indicators/ClariasaOutcomeIndicators.repository';
import { ClarisaOutcomeIndicator } from './clarisa-outcome-indicators/entities/clarisa-outcome-indicator.entity';
import { ClarisaRegionsTypeRepository } from './clarisa-region-types/ClariasaRegionsTypes.repository';
import { ClarisaRegionType } from './clarisa-region-types/entities/clarisa-region-type.entity';
import { ClarisaCountriesRepository } from './clarisa-countries/ClarisaCountries.repository';
import { ClarisaRegionsRepository } from './clarisa-regions/ClariasaRegions.repository';
import { ClarisaGobalTargetRepository } from './clarisa-global-target/ClariasaGlobalTarget.repository';
import { ClarisaGlobalTarget } from './clarisa-global-target/entities/clarisa-global-target.entity';
import { ClarisaInstitutionsTypeRepository } from './clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ClarisaInstitutionsRepository } from './clarisa-institutions/ClariasaInstitutions.repository';
import { HttpService } from '@nestjs/axios';
import { ClarisaPolicyStageRepository } from './clarisa-policy-stages/clarisa-policy-stages.repository';
import { ClarisaInnovationTypeRepository } from './clarisa-innovation-type/clarisa-innovation-type.repository';
import { ClarisaInnovationReadinessLevelRepository } from './clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.repository';
import { ClarisaInnovationCharacteristicRepository } from './clarisa-innovation-characteristics/clarisa-innovation-characteristics.repository';
import { lastValueFrom, map } from 'rxjs';
import { ClarisaGeographicScopeRepository } from './clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ClarisaActionAreaOutcomeRepository } from './clarisa-action-area-outcome/clarisa-action-area-outcome.repository';
import { TocResultsRepository } from '../toc/toc-results/toc-results.repository';
import { ClarisaCentersRepository } from './clarisa-centers/clarisa-centers.repository';
import { ClarisaPolicyTypeRepository } from './clarisa-policy-types/clarisa-policy-types.repository';
import { ClarisaSdgsRepository } from './clarisa-sdgs/clarisa-sdgs.repository';
import { ClarisaSdg } from './clarisa-sdgs/entities/clarisa-sdg.entity';
import { ClarisaSdgsTargetsRepository } from './clarisa-sdgs-targets/clarisa-sdgs-targets.repository';
import { ClarisaSdgsTarget } from './clarisa-sdgs-targets/entities/clarisa-sdgs-target.entity';
import { ClarisaTocPhaseRepository } from './clarisa-toc-phases/clarisa-toc-phases.repository';
import { ClarisaSubnationalScopeRepository } from './clarisa-subnational-scope/clarisa-subnational-scope.repository';
import { ClarisaSubnationalScope } from './clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';

@Injectable()
export class ClarisaTaskService {
  private readonly clarisaHost: string = `${env.CLA_URL}api/`;
  private readonly configAuth = {
    auth: {
      username: env.CLA_USER,
      password: env.CLA_PASSWORD,
    },
  };
  private readonly _logger: Logger = new Logger(ClarisaTaskService.name);
  constructor(
    private readonly _clarisaMeliaStudyTypeRepository: ClarisaMeliaStudyTypeRepository,
    private readonly _clariasaActionAreaRepository: ClariasaActionAreaRepository,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _clarisaImpactAreaRepository: ClarisaImpactAreaRepository,
    private readonly _clarisaImpactAreaInticatorsRepository: ClarisaImpactAreaInticatorsRepository,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
    private readonly _clarisaOutcomeIndicatorsRepository: ClarisaOutcomeIndicatorsRepository,
    private readonly _clarisaRegionsTypesRepository: ClarisaRegionsTypeRepository,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
    private readonly _clarisaGobalTargetRepository: ClarisaGobalTargetRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _clarisaInstitutionsTypeRepository: ClarisaInstitutionsTypeRepository,
    private readonly _clarisaPolicyStageRepository: ClarisaPolicyStageRepository,
    private readonly _clarisaInnovationTypeRepository: ClarisaInnovationTypeRepository,
    private readonly _clarisaInnovationReadinessLevelRepository: ClarisaInnovationReadinessLevelRepository,
    private readonly _clarisaInnovationCharacteristicRepository: ClarisaInnovationCharacteristicRepository,
    private readonly _clarisaGeographicScopeRepository: ClarisaGeographicScopeRepository,
    private readonly _clarisaActionAreaOutcomeRepository: ClarisaActionAreaOutcomeRepository,
    private readonly _tocResultsRepository: TocResultsRepository,
    private readonly _clarisaPolicyTypeRepository: ClarisaPolicyTypeRepository,
    private readonly _clarisaCentersRepository: ClarisaCentersRepository,
    private readonly _clarisaSdgsRepository: ClarisaSdgsRepository,
    private readonly _clarisaSdgsTargetsRepository: ClarisaSdgsTargetsRepository,
    private readonly _clarisaTocPhaseRepository: ClarisaTocPhaseRepository,
    private readonly _clarisaSubnationalScopeRepository: ClarisaSubnationalScopeRepository,
    private readonly _httpService: HttpService,
  ) {}

  public async clarisaBootstrap() {
    this._logger.debug(`Cloning of CLARISA control lists`);
    let count = 1;
    //count = await this.cloneClarisaCountries(count, true);
    //count = await this.cloneClarisaMeliaStudyTypes(count, true);
    //count = await this.cloneClarisaGlobalTargetType(count, true);
    //count = await this.cloneClarisaRegions(count, true);
    //count = await this.cloneClarisaInitiatives(count, true);
    //count = await this.cloneClarisaActionArea(count, true);
    //count = await this.cloneClarisaImpactAreaIndicators(count, true);
    //count = await this.cloneClarisaImpactArea(count, true);
    //count = await this.cloneClarisaOutcomeIndicators(count, true);
    //count = await this.cloneClarisaRegionsType(count, true);

    count = await this.cloneClarisaRegions(count);
    count = await this.cloneClarisaCountries(count);
    count = await this.cloneClarisaMeliaStudyTypes(count);
    count = await this.cloneClarisaActionArea(count);
    count = await this.cloneClarisaInitiatives(count);
    count = await this.cloneClarisaImpactArea(count);
    count = await this.cloneClarisaGlobalTargetType(count);
    count = await this.cloneClarisaImpactAreaIndicators(count);
    count = await this.cloneClarisaOutcomeIndicators(count);
    count = await this.cloneClarisaRegionsType(count);
    count = await this.cloneClarisaInstitutionsType(count);
    count = await this.cloneClarisaPolicyStageRepository(count);
    count = await this.cloneClarisaInnovationTypeRepository(count);
    count = await this.cloneClarisaInnovationReadinessLevelRepository(count);
    count = await this.cloneClarisaInnovationCharacteristicRepository(count);
    count = await this.cloneClarisaActionAreaOutcomeRepository(count);
    count = await this.cloneClarisaGeographicScope(count);
    count = await this.cloneClarisaCenterRepository(count);
    count = await this.cloneClarisaPolicyTypeRepository(count);
    count = await this.cloneClarisaSdgs(count);
    count = await this.cloneClarisaSdgsTargets(count);
    count = await this.cloneClarisaTocPhases(count);
    count = await this.cloneClarisaSubnationalScope(count);
    await this.cloneResultTocRepository(count);
  }

  public async clarisaBootstrapImportantData() {
    this._logger.debug(`Cloning of CLARISA important control lists`);
    const count = 1;
    await this.cloneClarisaInstitutions(count);
  }

  private async cloneClarisaSubnationalScope(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaSubnationalScopeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Subnational Scope control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}subnational-scope`,
          this.configAuth,
        );
        const subnationals: ClarisaSubnationalScope[] = data;
        await this._clarisaSubnationalScopeRepository.save(subnationals);
        this._logger.verbose(
          `[${position}]: All CLARISA Subnational Scope control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Subnational Scope`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaCountries(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaCountriesRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Countries control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}countries`,
          this.configAuth,
        );
        const countries: ClarisaCountry[] = data.map((el: any) => {
          return {
            id: el.code,
            iso_alpha_2: el.isoAlpha2,
            iso_alpha_3: el.isoAlpha3,
            name: el.name,
          };
        });
        await this._clarisaCountriesRepository.save(countries);
        this._logger.verbose(
          `[${position}]: All CLARISA Countries control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Countriess`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaRegions(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaMeliaStudyTypeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Regions control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}regions/un-regions`,
          this.configAuth,
        );
        await this._clarisaRegionsRepository.save(data);
        data.map((el: any) => {
          el['parent_regions_code'] = el.parentRegion?.um49Code
            ? el.parentRegion.um49Code
            : null;
        });
        await this._clarisaRegionsRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Regions control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Regions`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaMeliaStudyTypes(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaMeliaStudyTypeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA MELIA Study Type control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}study-types`,
          this.configAuth,
        );
        await this._clarisaMeliaStudyTypeRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA MELIA Study Type control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA MELIA Study Types`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaActionArea(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clariasaActionAreaRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Action Areas control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}action-areas`,
          this.configAuth,
        );
        await this._clariasaActionAreaRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Action Areas control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Action Areass`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaInitiatives(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaInitiativesRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Initiatives control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}initiatives`,
          this.configAuth,
        );
        const tocId =
          await this._clarisaInitiativesRepository.getTocIdFromOst();
        data.map((el: any) => {
          const tocData = tocId.filter((toc) => toc.initiativeId == el['id']);
          el['toc_id'] = tocData.length ? tocData[0].toc_id : null;
        });

        await this._clarisaInitiativesRepository.save(data);

        this._logger.verbose(
          `[${position}]: All CLARISA Initiatives control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Initiativess`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaImpactArea(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaImpactAreaRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Impact Area control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}impact-areas`,
          this.configAuth,
        );
        await this._clarisaImpactAreaRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Impact Area control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Impact Areas`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaImpactAreaIndicators(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaImpactAreaInticatorsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Impact Area Indicators control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}impact-area-indicators`,
          this.configAuth,
        );
        const mapdata = data.map((el: any) => ({
          id: el.indicatorId,
          indicator_statement: el.indicatorStatement,
          target_year: el.targetYear,
          target_unit: el.targetUnit,
          value: el.value || null,
          is_aplicable_projected_benefits: el.isAplicableProjectedBenefits,
          impact_area_id: el.impactAreaId,
          name: el.impactAreaName,
        }));
        await this._clarisaImpactAreaInticatorsRepository.save(mapdata);
        this._logger.verbose(
          `[${position}]: All CLARISA Impact Area Indicators control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Impact Area Indicators`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaOutcomeIndicators(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaOutcomeIndicatorsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Outcome Indicators control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}outcome-indicators`,
          this.configAuth,
        );
        await this._clarisaOutcomeIndicatorsRepository.save<ClarisaOutcomeIndicator>(
          data,
        );
        this._logger.verbose(
          `[${position}]: All CLARISA Outcome Indicators control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Outcome Indicators`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaRegionsType(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaRegionsTypesRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Region Types control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}region-types`,
          this.configAuth,
        );
        await this._clarisaRegionsTypesRepository.save<ClarisaRegionType>(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Region Types control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Region Types`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaGlobalTargetType(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaGobalTargetRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Global Target control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}global-targets`,
          this.configAuth,
        );

        await this._clarisaGobalTargetRepository.save<ClarisaGlobalTarget>(
          data,
        );
        this._logger.verbose(
          `[${position}]: All CLARISA Global Target control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Global Target`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaInstitutionsType(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaInstitutionsTypeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Institutions type control list data has been deleted`,
        );
      } else {
        const dataLegacy = await lastValueFrom(
          this._httpService
            .get(`${this.clarisaHost}institution-types?type=legacy`, {
              auth: { username: env.L_CLA_USER, password: env.L_CLA_PASSWORD },
            })
            .pipe(map((resp) => resp.data)),
        );
        dataLegacy.map((el: any) => {
          el['code'] = parseInt(el['code']);
          el['is_legacy'] = true;
        });
        const dataNew = await lastValueFrom(
          this._httpService
            .get(`${this.clarisaHost}institution-types/simple`, {
              auth: { username: env.L_CLA_USER, password: env.L_CLA_PASSWORD },
            })
            .pipe(map((resp) => resp.data)),
        );
        dataNew.map((el: any) => {
          el['code'] = parseInt(el['code']);
          el['is_legacy'] = false;
        });

        await this._clarisaInstitutionsTypeRepository.save(
          (dataLegacy ?? []).concat(dataNew ?? []),
        );

        this._logger.verbose(
          `[${position}]: All CLARISA Institutions type control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Institutions type`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaInstitutions(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaInstitutionsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Institutions control list data has been deleted`,
        );
      } else {
        const lastUpdated = (
          await this._clarisaInstitutionsRepository.getMostRecentLastUpdated()
        )[0]?.most_recent;
        const data = await lastValueFrom(
          this._httpService
            .get(
              `${this.clarisaHost}institutions?show=all${
                lastUpdated ? `&from=${lastUpdated}` : ''
              }`,
              {
                auth: {
                  username: env.L_CLA_USER,
                  password: env.L_CLA_PASSWORD,
                },
              },
            )
            .pipe(map((resp) => resp.data)),
        );
        data.map((dat: any) => {
          dat['institution_type_code'] = dat.institutionType.code ?? null;
          dat['id'] = dat.code;
          dat['website_link'] = dat.websiteLink;
          const hqarray: any[] = dat.countryOfficeDTO.filter(
            (hq: any) => hq.isHeadquarter == true,
          );
          dat['headquarter_country_iso2'] = hqarray.length
            ? hqarray[0].isoAlpha2
            : null;
        });

        await this._clarisaInstitutionsRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Institutions control list data has been created. Updated/created ${
            data.length ?? 0
          } institutions`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Institutions `,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaPolicyStageRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaPolicyStageRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Policy Stage control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}policy-stages`,
          this.configAuth,
        );
        await this._clarisaPolicyStageRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Policy Stage control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Policy Stage`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaPolicyTypeRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaPolicyTypeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Policy Type control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}policy-types`,
          this.configAuth,
        );
        await this._clarisaPolicyTypeRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Policy Type control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Policy Type`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaInnovationTypeRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaInnovationTypeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Innovation Type control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}innovation-types`,
          this.configAuth,
        );
        await this._clarisaInnovationTypeRepository.save<ClarisaRegionType>(
          data,
        );
        this._logger.verbose(
          `[${position}]: All CLARISA Innovation Type control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Innovation Type`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaInnovationReadinessLevelRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaInnovationReadinessLevelRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Innovation Readiness Level control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}innovation-readiness-levels`,
          this.configAuth,
        );
        await this._clarisaInnovationReadinessLevelRepository.save<ClarisaRegionType>(
          data,
        );
        this._logger.verbose(
          `[${position}]: All CLARISA Innovation Readiness Level control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Innovation Readiness Level`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaInnovationCharacteristicRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaInnovationCharacteristicRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Innovation Innovation Characteristic control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}innovation-characteristics`,
          this.configAuth,
        );
        await this._clarisaInnovationCharacteristicRepository.save<ClarisaRegionType>(
          data,
        );
        this._logger.verbose(
          `[${position}]: All CLARISA Innovation Innovation Characteristic control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Innovation Innovation Characteristic`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaActionAreaOutcomeRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaActionAreaOutcomeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Action Area Outcome control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}action-area-outcomes`,
          this.configAuth,
        );

        const uniqueData = [];
        const smoCodeTracker = {};

        for (const record of data) {
          const { outcomeSMOcode, actionAreaId } = record;
          const key = `${outcomeSMOcode}-${actionAreaId}`;

          if (!smoCodeTracker[key]) {
            smoCodeTracker[key] = true;
            uniqueData.push(record);
          }
        }

        await this._clarisaActionAreaOutcomeRepository.upsert(uniqueData, [
          'id',
        ]);
        this._logger.verbose(
          `[${position}]: All CLARISA Action Area Outcome control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Action Area Outcome`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaGeographicScope(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaGeographicScopeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Geographic scope control list data has been deleted`,
        );
      } else {
        const data = await lastValueFrom(
          this._httpService
            .get(`${this.clarisaHost}geographic-scopes?type=legacy`, {
              auth: { username: env.L_CLA_USER, password: env.L_CLA_PASSWORD },
            })
            .pipe(map((resp) => resp.data)),
        );
        data.map((dat: any) => {
          dat['id'] = dat.code;
          dat['description'] = dat.definition;
        });

        data.push({
          id: 50,
          description: '',
          name: 'This is yet to be determined',
        });

        await this._clarisaGeographicScopeRepository.save(data);
        this._logger.verbose(
          `[${position}]: All CLARISA Geographic scope control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Geographic Scope `,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneResultTocRepository(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._tocResultsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All ToC Results control list data has been deleted`,
        );
      } else {
        await this._tocResultsRepository.inactiveTocResult();
        const data = await this._tocResultsRepository.getAllTocResultsFromOst();
        await this._tocResultsRepository.save(data);
        //await this._tocResultsRepository.updateDeprecateDataToc();
        this._logger.verbose(
          `[${position}]: All ToC Results control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of ToC Results`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaCenterRepository(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        await this._clarisaCentersRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Centers control list data has been deleted`,
        );
      } else {
        const data = await lastValueFrom(
          this._httpService
            .get(`${this.clarisaHost}cgiar-entities`, {
              auth: { username: env.L_CLA_USER, password: env.L_CLA_PASSWORD },
            })
            .pipe(map((resp) => resp.data)),
        );
        const onlyCenters = data.filter(
          (d: any) => d.cgiarEntityTypeDTO.code == 4,
        );
        await this._clarisaCentersRepository.save(onlyCenters);
        this._logger.verbose(
          `[${position}]: All CLARISA Centers control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Centers`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaSdgs(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaSdgsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA SDGs control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}allSDG`,
          this.configAuth,
        );
        const sdgs: ClarisaSdg[] = data.map((cs: any) => {
          return {
            usnd_code: cs.usndCode,
            financial_code: cs.financialCode,
            full_name: cs.fullName,
            short_name: cs.shortName,
          };
        });

        for (const sdg of sdgs) {
          await this._clarisaSdgsRepository.upsert(sdg, ['usnd_code']);
        }

        this._logger.verbose(
          `[${position}]: All CLARISA SDGs control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA SDGs`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaSdgsTargets(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaSdgsTargetsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA SDGs Targets control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}sdg-targets/sdg-ipsr`,
          this.configAuth,
        );
        const sdgsTargets: ClarisaSdgsTarget[] = data.map((cst: any) => {
          return {
            id: cst.id,
            sdg_target_code: cst.sdgTargetCode,
            sdg_target: cst.sdgTarget,
            usnd_code: cst.usndCode,
          };
        });

        for (const sdgT of sdgsTargets) {
          await this._clarisaSdgsTargetsRepository.upsert(sdgT, ['id']);
        }
        this._logger.verbose(
          `[${position}]: All CLARISA SDGs Targets control list data has been created`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA SDGs Targets`,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private async cloneClarisaTocPhases(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        await this._clarisaTocPhaseRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Toc phases control list data has been deleted`,
        );
      } else {
        const data = await lastValueFrom(
          this._httpService
            .get(
              `${this.clarisaHost}phases/by-application/toc?show=all&status=all`,
              {
                auth: {
                  username: env.L_CLA_USER,
                  password: env.L_CLA_PASSWORD,
                },
              },
            )
            .pipe(map((resp) => resp.data)),
        );

        const mapData = data.map((el: any) => ({
          phase_id: el.phaseId,
          name: el.name,
          year: el.year,
          status: el.status,
          active: el.active,
        }));

        await this._clarisaTocPhaseRepository.save(mapData);
        this._logger.verbose(
          `[${position}]: All CLARISA Toc phases control list data has been created. Updated/created ${
            data.length ?? 0
          } Toc phases`,
        );
      }
      return ++position;
    } catch (error) {
      this._logger.error(
        `[${position}]: Error in manipulating the data of CLARISA Toc phases `,
      );
      this._logger.error(error);
      return ++position;
    }
  }

  private removeDuplicates(originalArray, prop) {
    const newArray = [];
    const lookupObject = {};

    for (const i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (const i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  }
}
