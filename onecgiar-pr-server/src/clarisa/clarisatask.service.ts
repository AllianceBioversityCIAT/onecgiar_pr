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
        private readonly _clarisaImpactAreaInticatorsRepository: ClarisaImpactAreaInticatorsRepository
    ) { }

    public async clarisaBootstrap() {
        this._logger.debug(`Cloning of CLARISA control lists`);
        let count: number = 1;
        count = await this.cloneClarisaMeliaStudyTypes(count, true);
        count = await this.cloneClarisaMeliaStudyTypes(count);
        count = await this.cloneClarisaInitiatives(count, true);
        count = await this.cloneClarisaActionArea(count, true);
        count = await this.cloneClarisaActionArea(count);
        count = await this.cloneClarisaInitiatives(count);
        count = await this.cloneClarisaImpactAreaIndicators(count, true);
        count = await this.cloneClarisaImpactArea(count, true);
        count = await this.cloneClarisaImpactArea(count);
        count = await this.cloneClarisaImpactAreaIndicators(count);
    }

    private async cloneClarisaCountries() {
        try {
            const countries = await axios.get(`${this.clarisaHost}countries`, this.configAuth);
            console.log(countries);
        } catch (error) {
            console.log(error)
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
                const { data } = await axios.get(`${this.clarisaHost}MELIA/study-types`, this.configAuth);
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
                const { data } = await axios.get(`${this.clarisaHost}allInitiatives`, this.configAuth);
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
                const { data } = await axios.get(`${this.clarisaHost}impact-areas-indicators`, this.configAuth);
                const ciai = data.map((el): ClarisaImpactAreaIndicator => {
                    return {
                        id: el.id,
                        impact_area_id: el.impactAreaId,
                        indicator_statement: el.indicatorStatement,
                        is_aplicable_projected_benefits: el.isAplicableProjectedBenefits,
                        target_unit: el.targetUnit,
                        target_year: el.targetYear,
                        value: el.value
                    }
                })
                this._clarisaImpactAreaInticatorsRepository.save(ciai);
                this._logger.verbose(`[${position}]: All CLARISA Impact Area Indicators control list data has been created`);
            }
            return ++position;
        } catch (error) {
            this._logger.error(`[${position}]: Error in manipulating the data of CLARISA Impact Area Indicators`);
            this._logger.error(error);
            return ++position;
        }
    }

}
