import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import axios, { AxiosRequestConfig } from 'axios'
import { ClarisaMeliaStudyType } from './clarisa-melia-study-type/entities/clarisa-melia-study-type.entity';
import { ClarisaMeliaStudyTypeRepository } from './clarisa-melia-study-type/ClariasaMeliasStudyType.repository';
import { ClarisaActionArea } from './clarisa-action-areas/entities/clarisa-action-area.entity';
import { ClariasaActionAreaRepository } from './clarisa-action-areas/ClariasaActionArea.repository';
import { ClarisaInitiativesRepository } from './clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaImpactAreaRepository } from './clarisa-impact-area/ClarisaImpactArea.repository';
import { ClarisaImpactAreaInticatorsRepository } from './clarisa-impact-area-indicators/ClarisaImpactAreaIndicators.repository';
import { ClarisaImpactAreaIndicator } from './clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';
import { ClarisaCountriesRepository } from './clarisa-countries/ClarisaCountries.repository';
import { ClarisaCountry } from './clarisa-countries/entities/clarisa-country.entity';
import { ClarisaOutcomeIndicatorsRepository } from './clarisa-outcome-indicators/ClariasaOutcomeIndicators.repository';
import { ClarisaOutcomeIndicator } from './clarisa-outcome-indicators/entities/clarisa-outcome-indicator.entity';
import { ClarisaRegionsTypesRepository } from './clarisa-regions/ClariasaRegionsTypes.repository';
import { ClarisaRegionType } from './region-types/entities/clarisa-region-type.entity';

@Injectable()
export class ClarisaTaskService {
    private readonly clarisaHost: string = env.CLA_URL || 'https://clarisa.cgiar.org/api/';
    private readonly configAuth: AxiosRequestConfig = {
        auth: {
            username: env.CLA_USER,
            password: env.CLA_PASSWORD
        }
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
        private readonly _clarisaRegionsTypesRepository: ClarisaRegionsTypesRepository
    ) { }

    public async clarisaBootstrap() {
        this._logger.debug(`Cloning of CLARISA control lists`);
        let count: number = 1;
        count = await this.cloneClarisaCountries(count, true);
        count = await this.cloneClarisaMeliaStudyTypes(count, true);
        count = await this.cloneClarisaInitiatives(count, true);
        count = await this.cloneClarisaActionArea(count, true);
        count = await this.cloneClarisaImpactAreaIndicators(count, true);
        count = await this.cloneClarisaImpactArea(count, true);
        count = await this.cloneClarisaOutcomeIndicators(count, true);
        count = await this.cloneClarisaRegionsType(count, true);
        count = await this.cloneClarisaCountries(count);
        count = await this.cloneClarisaMeliaStudyTypes(count);
        count = await this.cloneClarisaActionArea(count);
        count = await this.cloneClarisaInitiatives(count);
        count = await this.cloneClarisaImpactArea(count);
        count = await this.cloneClarisaImpactAreaIndicators(count);
        count = await this.cloneClarisaOutcomeIndicators(count);
        count = await this.cloneClarisaRegionsType(count);
    }

    private async cloneClarisaCountries(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaCountriesRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Countries control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}countries`, this.configAuth);
                const countries: ClarisaCountry[] = data.map((el) => {
                    return {
                        id: el.code,
                        iso_alpha_2: el.isoAlpha2,
                        iso_alpha_3: el.isoAlpha3,
                        name: el.name
                    }
                })
                this._clarisaCountriesRepository.save(countries);
                this._logger.verbose(`[${position}]: All CLARISA Countries control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Countriess`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaRegions() {
        try {
            const regions = await axios.get(`${this.clarisaHost}un-regions`, this.configAuth);
            console.log(regions);
        } catch (error) {
            console.log(error)
        }
    }

    private async cloneClarisaMeliaStudyTypes(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaMeliaStudyTypeRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA MELIA Study Type control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}study-types`, this.configAuth);
                this._clarisaMeliaStudyTypeRepository.save(data);
                this._logger.verbose(`[${position}]: All CLARISA MELIA Study Type control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA MELIA Study Types`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaActionArea(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clariasaActionAreaRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Action Areas control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}action-areas`, this.configAuth);
                this._clariasaActionAreaRepository.save(data);
                this._logger.verbose(`[${position}]: All CLARISA Action Areas control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Action Areass`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaInitiatives(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaInitiativesRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Initiatives control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}initiatives`, this.configAuth);
                this._clarisaInitiativesRepository.save(data);
                this._logger.verbose(`[${position}]: All CLARISA Initiatives control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Initiativess`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaImpactArea(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaImpactAreaRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Impact Area control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}impact-areas`, this.configAuth);
                this._clarisaImpactAreaRepository.save(data);
                this._logger.verbose(`[${position}]: All CLARISA Impact Area control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Impact Areas`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaImpactAreaIndicators(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaImpactAreaInticatorsRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Impact Area Indicators control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}impact-area-indicators`, this.configAuth);
                this._clarisaImpactAreaInticatorsRepository.save(data);
                this._logger.verbose(`[${position}]: All CLARISA Impact Area Indicators control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Impact Area Indicators`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaOutcomeIndicators(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaOutcomeIndicatorsRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Outcome Indicators control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}outcome-indicators`, this.configAuth);
                this._clarisaOutcomeIndicatorsRepository.save<ClarisaOutcomeIndicator>(data);
                this._logger.verbose(`[${position}]: All CLARISA Outcome Indicators control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Outcome Indicators`);
            this._logger.error(error);
            return ++position;
        }
    }

    private async cloneClarisaRegionsType(position: number, deleteItem:boolean = false) {
        try {
            if (deleteItem) {
                const deleteData = await this._clarisaRegionsTypesRepository.deleteAllData();
                this._logger.warn(`[${position}]: All CLARISA Region Types control list data has been deleted`);
            } else {
                const { data } = await axios.get(`${this.clarisaHost}region-types`, this.configAuth);
                this._clarisaRegionsTypesRepository.save<ClarisaRegionType>(data);
                this._logger.verbose(`[${position}]: All CLARISA Region Types control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Region Types`);
            this._logger.error(error);
            return ++position;
        }
    }

}
