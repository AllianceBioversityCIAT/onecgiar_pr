import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import axios, { AxiosRequestConfig } from 'axios';
import { ClarisaMeliaStudyType } from './clarisa-melia-study-type/entities/clarisa-melia-study-type.entity';
import { ClarisaMeliaStudyTypeRepository } from './clarisa-melia-study-type/ClariasaMeliasStudyType.repository';
import { ClarisaActionArea } from './clarisa-action-areas/entities/clarisa-action-area.entity';
import { ClariasaActionAreaRepository } from './clarisa-action-areas/ClariasaActionArea.repository';
import { ClarisaInitiativesRepository } from './clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaImpactAreaRepository } from './clarisa-impact-area/ClarisaImpactArea.repository';
import { ClarisaImpactAreaInticatorsRepository } from './clarisa-impact-area-indicators/ClarisaImpactAreaIndicators.repository';
import { ClarisaImpactAreaIndicator } from './clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';
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

@Injectable()
export class ClarisaTaskService {
  private readonly clarisaHost: string =
    env.CLA_URL ?? env.L_CLA_URL;
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
    private readonly _httpService: HttpService
  ) {}

  public async clarisaBootstrap() {
    this._logger.debug(`Cloning of CLARISA control lists`);
    let count = 1;
    count = await this.cloneClarisaCountries(count, true);
    count = await this.cloneClarisaMeliaStudyTypes(count, true);
    count = await this.cloneClarisaGlobalTargetType(count, true);
    count = await this.cloneClarisaRegions(count, true);
    //count = await this.cloneClarisaInitiatives(count, true);
    //count = await this.cloneClarisaActionArea(count, true);
    count = await this.cloneClarisaImpactAreaIndicators(count, true);
    count = await this.cloneClarisaImpactArea(count, true);
    count = await this.cloneClarisaOutcomeIndicators(count, true);
    count = await this.cloneClarisaRegionsType(count, true);
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
    count = await this.cloneClarisaInstitutions(count);
  }

  private async cloneClarisaCountries(position: number, deleteItem = false) {
    try {
      if (deleteItem) {
        const deleteData =
          await this._clarisaCountriesRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Countries control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}countries`,
          this.configAuth,
        );
        const countries: ClarisaCountry[] = data.map((el) => {
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
        const deleteData =
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
        data.map((el) => {
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
        const deleteData =
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
        const deleteData =
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
        const deleteData =
          await this._clarisaInitiativesRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Initiatives control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}initiatives`,
          this.configAuth,
        );
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
        const deleteData =
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
        const deleteData =
          await this._clarisaImpactAreaInticatorsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Impact Area Indicators control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}impact-area-indicators`,
          this.configAuth,
        );
        await this._clarisaImpactAreaInticatorsRepository.save(data);
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
        const deleteData =
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
        const deleteData =
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
        const deleteData =
          await this._clarisaGobalTargetRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Global Target control list data has been deleted`,
        );
      } else {
        const { data } = await axios.get(
          `${this.clarisaHost}global-targets`,
          this.configAuth,
        );
        const transformData = data.map((el) => {
          return {
            id: el.targetId,
            target: el.target,
            impact_area_id: el.impactAreasId,
          };
        });
        await this._clarisaGobalTargetRepository.save<ClarisaGlobalTarget>(
          transformData,
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
        const deleteData =
          await this._clarisaInstitutionsTypeRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Institutions type control list data has been deleted`,
        );
      } else {
        const data = await this._httpService.get(`${env.L_CLA_URL}institution-types`, {auth: {username:'pandr.data', password: 'PandR.data2022' }});
        await data.subscribe(async el => {
          const {data} = el;
          await this._clarisaInstitutionsTypeRepository.save(
            data,
          );
        });
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

  private async cloneClarisaInstitutions(
    position: number,
    deleteItem = false,
  ) {
    try {
      if (deleteItem) {
        const deleteData =
          await this._clarisaInstitutionsRepository.deleteAllData();
        this._logger.warn(
          `[${position}]: All CLARISA Institutions control list data has been deleted`,
        );
      } else {
        const data = await this._httpService.get(`${env.L_CLA_URL}institutions`, {auth: {username:'pandr.data', password: 'PandR.data2022' }});
        await data.subscribe(async el => {
          const {data} = el;
          console.log(data);
          data.map(dat => {
            dat['institution_type_code'] = dat.institutionType.code ?? null;
            dat['id'] = dat.code;
            dat['website_link'] = dat.websiteLink;
          })
          await this._clarisaInstitutionsRepository.save(
            data,
          );
        });
        this._logger.verbose(
          `[${position}]: All CLARISA Institutions control list data has been created`,
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
}
