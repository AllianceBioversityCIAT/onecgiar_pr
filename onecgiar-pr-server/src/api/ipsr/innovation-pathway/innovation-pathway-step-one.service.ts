import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { innovatonUseInterface, UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';
import { ResultRegion } from '../../results/result-regions/entities/result-region.entity';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { InnovationPackagingExpert } from '../innovation-packaging-experts/entities/innovation-packaging-expert.entity';
import { Result } from '../../results/entities/result.entity';
import { Version } from '../../results/versions/entities/version.entity';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { IpsrRepository } from '../ipsr.repository';
import { CreateResultIPDto } from '../result-innovation-package/dto/create-result-ip.dto';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultIpSdgTargets } from './entities/result-ip-sdg-targets.entity';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpEoiOutcome } from './entities/result-ip-eoi-outcome.entity';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultIpAAOutcome } from './entities/result-ip-action-area-outcome.entity';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../result-ip-measures/result-ip-measures.repository';
import { ResultIpMeasure } from '../result-ip-measures/entities/result-ip-measure.entity';
import { ResultIpImpactAreaRepository } from './repository/result-ip-impact-area-targets.repository';
import { ResultIpImpactArea } from './entities/result-ip-impact-area.entity';
import { ResultInnovationPackage } from '../result-innovation-package/entities/result-innovation-package.entity';
import { ResultByInstitutionsByDeliveriesType } from 'src/api/results/result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { In, IsNull } from 'typeorm';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ClarisaInstitutionsTypeRepository } from '../../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultIpExpertisesRepository } from '../innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultIpExpertises } from '../innovation-packaging-experts/entities/result_ip_expertises.entity';
import e from 'express';

@Injectable()
export class InnovationPathwayStepOneService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository,
    protected readonly _versionsService: VersionsService,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    protected readonly _resultIpEoiOutcomes: ResultIpEoiOutcomeRepository,
    protected readonly _resultIpAAOutcomes: ResultIpAAOutcomeRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository,
    protected readonly _resultActorRepository: ResultActorRepository,
    protected readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    protected readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    protected readonly _resultIpImpactAreasRepository: ResultIpImpactAreaRepository,
    protected readonly _clarisaInstitutionsTypeRepository: ClarisaInstitutionsTypeRepository,
    protected readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    protected readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    protected readonly _resultIpExpertisesRepository: ResultIpExpertisesRepository
  ) { }

  async getStepOne(resultId: number) {
    try {
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: resultId });

      const result =
        await this._resultRepository.findOne(
          {
            where: {
              id: resultId,
              is_active: true
            }
          }
        );
      // * Validate if the query incoming empty
      if (!result) {
        return {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const geo_scope_id = result.geographic_scope_id;
      const coreResult = await this._innovationByResultRepository.getInnovationCoreStepOne(resultId);
      const regions: ResultRegion[] = await this._resultRegionRepository.getResultRegionByResultId(resultId);
      const countries: ResultCountry[] = await this._resultCountryRepository.getResultCountriesByResultId(resultId);
      const eoiOutcomes: ResultIpEoiOutcome[] = await this._resultIpEoiOutcomes.getEoiOutcomes(resultByInnovationPackageId.result_by_innovation_package_id);
      const actionAreaOutcomes: ResultIpAAOutcome[] = await this._resultIpAAOutcomes.getAAOutcomes(resultByInnovationPackageId.result_by_innovation_package_id);
      const impactAreas: ResultIpImpactArea[] = await this._resultIpImpactAreasRepository.getImpactAreas(resultByInnovationPackageId.result_by_innovation_package_id);
      const sdgTargets: ResultIpSdgTargets[] = await this._resultIpSdgsTargetsRepository.getSdgs(resultByInnovationPackageId.result_by_innovation_package_id);
      const resultInnovationPackage: ResultInnovationPackage[] = await this._resultInnovationPackageRepository.findBy({ result_innovation_package_id: resultId, is_active: true });
      const institutions: ResultsByInstitution[] = await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(resultId, 5);
      const deliveries: ResultByInstitutionsByDeliveriesType[] = await await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(institutions?.map(el => el.id));
      institutions?.map(int => {
        int['deliveries'] = deliveries?.filter(del => del.result_by_institution_id == int.id).map(del => del.partner_delivery_type_id);
      });
      const experts = await this._innovationPackagingExpertRepository.find({
        where: {
          result_id: result.id,
          is_active: true
        }
      });

      await experts.map(async el => {
        el.expertises = await this._resultIpExpertisesRepository.find({
          where: {
            result_ip_expert_id: el.result_ip_expert_id,
            is_active: true
          },
          relations: {
            obj_expertises: true
          }
        })
      })
      let actorsData = await this._resultActorRepository.find({ where: { result_id: result.id, is_active: true }, relations: { obj_actor_type: true } });
      actorsData.map(el => {
        el['men_non_youth'] = el.men - el.men_youth;
        el['women_non_youth'] = el.women - el.women_youth;
      });
      const innovatonUse = {
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({ where: { result_ip_id: result.id, is_active: true } }),
        organization: (await this._resultByIntitutionsTypeRepository.find({ where: { results_id: result.id, institution_roles_id: 5, is_active: true }, relations: { obj_institution_types: { obj_parent: { obj_parent: true } } } })).map(el => ({ ...el, parent_institution_type_id: el.obj_institution_types?.obj_parent?.obj_parent?.code || null }))
      }
      const result_ip = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id,
          is_active: true
        }
      });

      const resInitLead = await this._resultByInitiativesRepository.findOne({
        where: {
          result_id: result.id,
          is_active: true,
          initiative_role_id: 1
        },
        relations: {
          obj_initiative: true
        }
      })

      const coreData = await this._innovationByResultRepository.findOne({ where: { result_innovation_package_id: result.id, is_active: true, ipsr_role_id: 1 }, relations: { obj_result: true } });

      const scalig_ambition = {
        title: `2024 Scaling Ambition blurb`,
        body: `By 2024, the ${resInitLead?.obj_initiative?.short_name} and partners will work together with${this.arrayToStringAnd(institutions?.map(el => el['institutions_name']))} to accomplish the use of ${coreData?.obj_result?.title} by ${this.arrayToStringActorsAnd(innovatonUse.actors.map(el => el))} ${geo_scope_id == 1 ? '' : `in ${this.arrayToStringGeoScopeAnd(geo_scope_id, regions.map(el => el), countries.map(el => el))}`} to contribute achieving ${this.arrayToStringAnd(eoiOutcomes?.map(el => el['title']))}.`
      };
      return {
        response: await {
          result_id: result.id,
          scalig_ambition,
          geo_scope_id,
          coreResult,
          result_ip,
          institutions,
          experts,
          innovatonUse,
          result,
          regions,
          countries,
          eoiOutcomes,
          actionAreaOutcomes,
          impactAreas,
          sdgTargets,
          resultInnovationPackage,
        }
        ,
        message: 'Result data',
        status: HttpStatus.OK,
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  arrayToStringAnd(arrayData: any[]) {
    const count = arrayData?.length;
    const lastElement = arrayData.pop();
    return count ? `${arrayData.toString().replace(/,/g, ', ')}${count > 1 ? ' and' : ''} ${lastElement}` : '<Data not provided>';
  }

  arrayToStringGeoScopeAnd(geoId: number, r: ResultRegion[], c: ResultCountry[]) {
    let returnData: string = '';
    if (geoId == 1) {
      return
    } else if (geoId == 2) {
      returnData = this.arrayToStringAnd(r.map(el => el['name']));
    } else if (geoId == 3 || geoId == 4) {
      returnData = this.arrayToStringAnd(c.map(el => el['name']));
    } else if (geoId == 5) {
      returnData = '<Data not provided>';
    }

    return returnData;
  }

  arrayToStringActorsAnd(arrayData: ResultActor[]) {
    const count = arrayData?.length;
    if (!count) {
      return '<Data not provided>';
    }
    const lastElement = arrayData.pop();
    let actors: string = '';
    for (const i of arrayData) {
      actors += `${i.men + i.women} ${i?.obj_actor_type?.name}`
    }
    return `${actors} ${count > 1 ? 'and ' : ''}${lastElement.men + lastElement.women} ${lastElement?.obj_actor_type?.name}`;
  }

  async updateMain(resultId: number, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    try {
      // * Check if result already exists
      const result =
        await this._resultRepository.findOne(
          {
            where: {
              id: resultId,
              is_active: true
            }
          }
        );
      // * Validate if the query incoming empty
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      const geoScope = await this.geoScope(result, version, UpdateInnovationPathwayDto, user);
      const specifyAspiredOutcomesAndImpact = await this.saveSpecifyAspiredOutcomesAndImpact(result, version, UpdateInnovationPathwayDto, user);
      const actionAreaOutcomes = await this.saveActionAreaOutcomes(result, version, UpdateInnovationPathwayDto, user);
      const impactAreas = await this.saveImpactAreas(result, version, UpdateInnovationPathwayDto, user);
      const sdgTargets = await this.saveSdgTargets(result, version, UpdateInnovationPathwayDto, user);
      const experts = await this.saveInnovationPackagingExperts(result, version, user, UpdateInnovationPathwayDto);
      const consensus = await this.saveConsensus(result, user, version, UpdateInnovationPathwayDto.result_ip);
      const partners = await this.savePartners(result, user, version, UpdateInnovationPathwayDto);
      const innovationUse = await this.saveInnovationUse(result, user, version, UpdateInnovationPathwayDto);

      return {
        response: [
          geoScope,
          specifyAspiredOutcomesAndImpact,
          actionAreaOutcomes,
          impactAreas,
          sdgTargets,
          experts,
          consensus,
          partners,
          innovationUse
        ],
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }

  }

  async geoScope(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const req = UpdateInnovationPathwayDto;
      const regions = UpdateInnovationPathwayDto.regions;
      const countries = UpdateInnovationPathwayDto.countries;

      const updateGeoScope = await this._resultRepository.update(id, {
        geographic_scope_id: req?.geo_scope_id,
        last_updated_by: user.id,
        last_updated_date: new Date()
      });

      let resultRegions: ResultRegion[] = [];
      let resultCountries: ResultCountry[] = [];
      let updateRegions: any;
      let updateCountries: any;


      let innovationGeoScope: number;

      // * Check Geo Scope
      if (UpdateInnovationPathwayDto.geo_scope_id === 1) {
        innovationGeoScope = 1;
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 2) {
        innovationGeoScope = 2;
      } else if (countries?.length > 1) {
        innovationGeoScope = 3
      } else {
        innovationGeoScope = 4
      }


      if (UpdateInnovationPathwayDto.geo_scope_id !== 2) {
        await this._resultRegionRepository.updateRegions(id, [])
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 2) {
        if (regions) {
          await this._resultRegionRepository.updateRegions(id, UpdateInnovationPathwayDto.regions.map(r => r.id));
          if (regions?.length) {
            for (let i = 0; i < regions.length; i++) {
              const regionsExist = await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(id, regions[i].id);
              if (!regionsExist) {
                const newRegions = new ResultRegion();
                newRegions.region_id = regions[i].id;
                newRegions.result_id = id;
                newRegions.version_id = version.id;
                resultRegions.push(newRegions);
              }

              updateRegions = await this._resultRegionRepository.save(resultRegions);
            }
          }
        }
      }

      if (UpdateInnovationPathwayDto.geo_scope_id === 1 || UpdateInnovationPathwayDto.geo_scope_id === 2) {
        await this._resultCountryRepository.updateCountries(id, []);
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 3 || UpdateInnovationPathwayDto.geo_scope_id === 4) {
        await this._resultCountryRepository.updateCountries(id, UpdateInnovationPathwayDto.countries.map(c => c.id));
        if (countries?.length) {
          for (let i = 0; i < countries.length; i++) {
            const countriExist = await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(id, countries[i].id);
            if (!countriExist) {
              const newCountries = new ResultCountry();
              newCountries.country_id = countries[i].id;
              newCountries.result_id = id;
              newCountries.version_id = version.id
              resultCountries.push(newCountries);
            }

            updateCountries = await this._resultCountryRepository.save(resultCountries);
          }
        }
      }

      const ipsrResult =
        await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id });

      const coreResult =
        await this._resultRepository.findOneBy({ id: ipsrResult.result_id });

      let innovationTitle: string;

      if (UpdateInnovationPathwayDto.geo_scope_id === 2) {
        const regionsList = regions.map(r => r.name);
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${coreResult.title} in ${regionsList.slice(0, -1).join(', ')}${regionsList.length > 1 ? ' and ' : ''}${regionsList[regionsList.length - 1]}`;
      } else if (UpdateInnovationPathwayDto.geo_scope_id === 3 || UpdateInnovationPathwayDto.geo_scope_id === 4) {
        const countriesList = countries.map(c => c.name);
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${coreResult.title} in ${countriesList.slice(0, -1).join(', ')}${countriesList.length > 1 ? ' and ' : ''}${countriesList[countriesList.length - 1]}`;
      } else {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${coreResult.title}.`;
      }


      if (result.title === innovationTitle) {
        throw {
          response: innovationTitle,
          message: `The title no needs to be upgraded`,
          status: HttpStatus.NOT_MODIFIED,
        }
      } else {
        const titleValidate = await this._resultRepository
          .createQueryBuilder('result')
          .where('result.title = :title', { title: `${innovationTitle}` })
          .andWhere('result.is_active = 1')
          .getMany();

        if (titleValidate.find(tv => tv.id === id)) {
          throw {
            response: titleValidate.map(tv => tv.id),
            message: `The title already exists, in the following results: ${titleValidate.map(tv => tv.result_code)}`,
            status: HttpStatus.BAD_REQUEST,
          }
        } else {
          await this._resultRepository.update(id, {
            title: innovationTitle || result.title,
            last_updated_by: user.id,
            geographic_scope_id: innovationGeoScope,
            last_updated_date: new Date(),
          });
        }
      }


      return {
        response: innovationTitle,
        message: 'The Geographic Scope and Title was updated correctly',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSpecifyAspiredOutcomesAndImpact(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
      const eoiOutcomes = UpdateInnovationPathwayDto.eoiOutcomes;

      const allTocByResult = await this._resultIpEoiOutcomes.find({
        where: { result_by_innovation_package_id: result_by_innovation_package_id },
      });

      const existingIds = allTocByResult.map(et => et.toc_result_id);

      const tocsToActive = allTocByResult.filter(
        eoi =>
          eoiOutcomes.find(e => e.toc_result_id === eoi.toc_result_id) &&
          eoi.is_active === false,
      );

      const tocsToInactive = allTocByResult.filter(
        eoi =>
          !eoiOutcomes.find(e => e.toc_result_id === eoi.toc_result_id) &&
          eoi.is_active === true,
      );

      const tocsToSave = eoiOutcomes?.filter(
        eoi => !existingIds.includes(eoi.toc_result_id),
      );

      const saveToc = [];

      if (tocsToSave?.length > 0) {
        for (const entity of tocsToSave) {
          const newEoi = new ResultIpEoiOutcome();
          newEoi.toc_result_id = entity.toc_result_id;
          newEoi.result_by_innovation_package_id = result_by_innovation_package_id;
          newEoi.version_id = version.id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          saveToc.push(this._resultIpEoiOutcomes.save(newEoi));
        }
      }

      if (tocsToActive?.length > 0) {
        for (const entity of tocsToActive) {
          entity.is_active = true;
          saveToc.push(this._resultIpEoiOutcomes.save(entity));
        }
      }

      if (tocsToInactive?.length > 0) {
        for (const entity of tocsToInactive) {
          entity.is_active = false;
          saveToc.push(this._resultIpEoiOutcomes.save(entity));
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The EOI Outcomes have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveActionAreaOutcomes(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
      const aaOutcomes = UpdateInnovationPathwayDto.actionAreaOutcomes;

      const allAAOutcome = await this._resultIpAAOutcomes.find({
        where: { result_by_innovation_package_id: result_by_innovation_package_id },
      });

      const existingIds = allAAOutcome.map(et => et.action_area_outcome_id);

      const aaToActive = allAAOutcome.filter(
        eoi =>
          aaOutcomes.find(e => e.action_area_outcome_id === eoi.action_area_outcome_id) &&
          eoi.is_active === false,
      );

      const aaToInactive = allAAOutcome.filter(
        eoi =>
          !aaOutcomes.find(e => e.action_area_outcome_id === eoi.action_area_outcome_id) &&
          eoi.is_active === true,
      );

      const aaToSave = aaOutcomes.filter(
        eoi => !existingIds.includes(eoi.action_area_outcome_id),
      );

      const saveActionAreas = [];

      if (aaToSave?.length > 0) {
        for (const entity of aaToSave) {
          const newEoi = new ResultIpAAOutcome();
          newEoi.action_area_outcome_id = entity.action_area_outcome_id;
          newEoi.result_by_innovation_package_id = result_by_innovation_package_id;
          newEoi.version_id = version.id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          saveActionAreas.push(this._resultIpAAOutcomes.save(newEoi));
        }
      }

      if (aaToActive?.length > 0) {
        for (const entity of aaToActive) {
          entity.is_active = true;
          saveActionAreas.push(this._resultIpAAOutcomes.save(entity));
        }
      }

      if (aaToInactive?.length > 0) {
        for (const entity of aaToInactive) {
          entity.is_active = false;
          saveActionAreas.push(this._resultIpAAOutcomes.save(entity));
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The Action Area Outcomes have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveImpactAreas(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
      const impactAreas = UpdateInnovationPathwayDto.impactAreas;

      const allImpactAreas = await this._resultIpImpactAreasRepository.find({
        where: { result_by_innovation_package_id: result_by_innovation_package_id },
      });

      const existingIds = allImpactAreas.map(et => et.impact_area_indicator_id);

      const impactAreasToActive = allImpactAreas.filter(
        ia =>
          impactAreas.find(e => e.targetId === ia.impact_area_indicator_id) &&
          ia.is_active === false,
      );

      const impactAreasToInactive = allImpactAreas.filter(
        ia =>
          !impactAreas.find(e => e.targetId === ia.impact_area_indicator_id) &&
          ia.is_active === true,
      );

      const impactAreasToSave = impactAreas.filter(
        ia => !existingIds.includes(ia.targetId),
      );

      const saveImpactAreas = [];

      if (impactAreasToSave?.length > 0) {
        for (const entity of impactAreasToSave) {
          const newEoi = new ResultIpImpactArea();
          newEoi.impact_area_indicator_id = entity.targetId;
          newEoi.result_by_innovation_package_id = result_by_innovation_package_id;
          newEoi.version_id = version.id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          saveImpactAreas.push(this._resultIpImpactAreasRepository.save(newEoi));
        }
      }

      if (impactAreasToActive?.length > 0) {
        for (const entity of impactAreasToActive) {
          entity.is_active = true;
          saveImpactAreas.push(this._resultIpImpactAreasRepository.save(entity));
        }
      }

      if (impactAreasToInactive?.length > 0) {
        for (const entity of impactAreasToInactive) {
          entity.is_active = false;
          saveImpactAreas.push(this._resultIpImpactAreasRepository.save(entity));
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The Impact Areas have been saved successfully',
        status: HttpStatus.OK
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSdgTargets(result: any, version: Version, UpdateInnovationPathwayDto: UpdateInnovationPathwayDto, user: TokenDto) {
    const id = result.id;
    try {
      let saveSdgs: any;
      let sdgsTargets: ResultIpSdgTargets[] = [];
      const resultByInnovationPackageId = await this._innovationByResultRepository.findOneBy({ result_innovation_package_id: id })
      const sdgs = UpdateInnovationPathwayDto.sdgTargets;

      await this._resultIpSdgsTargetsRepository.updateSdg(resultByInnovationPackageId.result_by_innovation_package_id, sdgs.map(c => c.id), user.id);
      if (sdgs?.length) {
        for (let i = 0; i < sdgs.length; i++) {
          const sdgExist = await this._resultIpSdgsTargetsRepository.getSdgsByIpAndSdgId(resultByInnovationPackageId.result_by_innovation_package_id, sdgs[i].id);

          if (!sdgExist) {
            const newSdgs = new ResultIpSdgTargets();
            newSdgs.clarisa_sdg_target_id = sdgs[i].id;
            newSdgs.clarisa_sdg_usnd_code = sdgs[i].usnd_code;
            newSdgs.result_by_innovation_package_id = resultByInnovationPackageId.result_by_innovation_package_id;
            newSdgs.created_by = user.id;
            newSdgs.version_id = version.id;
            newSdgs.last_updated_by = user.id;
            newSdgs.created_date = new Date();
            newSdgs.last_updated_date = new Date();
            sdgsTargets.push(newSdgs);
          }

          saveSdgs = await this._resultIpSdgsTargetsRepository.save(sdgsTargets);
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The SDGs have been saved successfully',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async saveInnovationPackagingExperts(result: Result, v: Version, user: TokenDto, { result_ip: rpData, experts }: UpdateInnovationPathwayDto) {
    const rip = await this._resultInnovationPackageRepository.findOne({
      where: {
        result_innovation_package_id: result.id
      }
    });

    if (rip) {
      this._resultInnovationPackageRepository.update(
        result.id,
        {
          last_updated_by: user.id,
          experts_is_diverse: rpData?.experts_is_diverse,
          is_not_diverse_justification: !rpData?.experts_is_diverse ? rpData?.is_not_diverse_justification : null
        }
      );
    } else {
      this._resultInnovationPackageRepository.save({
        result_innovation_package_id: result.id,
        last_updated_by: user.id,
        created_by: user.id,
        experts_is_diverse: rpData?.experts_is_diverse,
        is_not_diverse_justification: !rpData?.experts_is_diverse ? rpData?.is_not_diverse_justification : null
      })
    }

    if (experts?.length) {
      for (const ex of experts) {
        let innExp: InnovationPackagingExpert = null;
        if (ex?.result_ip_expert_id) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              result_ip_expert_id: ex.result_ip_expert_id,
              result_id: result.id
            }
          });
        } else if (!innExp && ex?.email) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              email: ex.email,
              result_id: result.id
            }
          });
        } else if (!innExp) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              email: IsNull(),
              result_id: result.id
            }
          });
        }

        if (innExp) {
          await this._innovationPackagingExpertRepository.update(
            innExp.result_ip_expert_id,
            {
              first_name: ex?.first_name,
              last_name: ex?.last_name,
              version_id: v.id,
              is_active: ex.is_active == undefined ? true : ex.is_active,
              email: ex?.email,
              last_updated_by: user.id,
              expertises_id: ex?.expertises_id,
              organization_id: ex?.organization_id
            }
          )
        } else {
          innExp = await this._innovationPackagingExpertRepository.save(
            {
              first_name: ex?.first_name,
              last_name: ex?.last_name,
              version_id: v.id,
              is_active: ex?.is_active,
              email: ex?.email,
              last_updated_by: user.id,
              created_by: user.id,
              expertises_id: ex?.expertises_id,
              organization_id: ex?.organization_id,
              result_id: result.id
            }
          )
        }


        await this.saveExpertises(ex.expertises, innExp.result_ip_expert_id, user, v);
      }
    }
  }

  private async saveExpertises(exps: ResultIpExpertises[], result_ip_expert_id: number, user: TokenDto, v: Version) {
    await exps.map(async (el) => {
      let riesEx: ResultIpExpertises = null;
      if (el?.result_ip_expertises_id) {
        riesEx = await this._resultIpExpertisesRepository.findOne({
          where: {
            result_ip_expertises_id: el?.result_ip_expertises_id
          }
        });
      } else if (el?.expertises_id) {
        riesEx = await this._resultIpExpertisesRepository.findOne({
          where: {
            expertises_id: el.expertises_id,
            result_ip_expert_id: result_ip_expert_id
          }
        });
      }

      if (riesEx) {
        await this._resultIpExpertisesRepository.update(
          riesEx.result_ip_expertises_id,
          {
            is_active: el.is_active == undefined ? true : el.is_active,
            expertises_id: el.expertises_id,
            last_updated_by: user.id
          }
        );
      } else {
        await this._resultIpExpertisesRepository.save({
          created_by: user.id,
          last_updated_by: user.id,
          expertises_id: el.expertises_id,
          result_ip_expert_id: result_ip_expert_id,
          version_id: v.id,
        });
      }

    });
  }

  private async saveConsensus(result: Result, user: TokenDto, version: Version, rip: CreateResultIPDto) {
    try {
      const ripExists = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id
        }
      });
      if (ripExists) {
        await this._resultInnovationPackageRepository.update(
          ripExists.result_innovation_package_id,
          {
            active_backstopping_id: rip.active_backstopping_id,
            consensus_initiative_work_package_id: rip.consensus_initiative_work_package_id,
            regional_integrated_id: rip.regional_integrated_id,
            relevant_country_id: rip.relevant_country_id,
            regional_leadership_id: rip.regional_leadership_id,
            is_active: true,
            last_updated_by: user.id
          }
        );
      } else {
        await this._resultInnovationPackageRepository.save(
          {
            result_innovation_package_id: result.id,
            active_backstopping_id: rip.active_backstopping_id,
            consensus_initiative_work_package_id: rip.consensus_initiative_work_package_id,
            regional_integrated_id: rip.regional_integrated_id,
            relevant_country_id: rip.relevant_country_id,
            regional_leadership_id: rip.regional_leadership_id,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id
          }
        );
      }
      const res = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id
        }
      });
      return res;
    } catch (error) {
      return null
    }
  }

  private async savePartners(result: Result, user: TokenDto, version: Version, crtr: UpdateInnovationPathwayDto) {
    if (crtr?.institutions?.length) {
      const { institutions: inst } = crtr;
      await this._resultByIntitutionsRepository.updateGenericIstitutions(result.id, inst, 5, user.id);
      for (const ins of inst) {
        const instExist = await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(result.id, ins.institutions_id, 5);
        let rbi: ResultsByInstitution = null;
        if (!instExist) {
          rbi = await this._resultByIntitutionsRepository.save({
            institution_roles_id: 5,
            institutions_id: ins.institutions_id,
            result_id: result.id,
            version_id: version.id,
            created_by: user.id,
            last_updated_by: user.id
          })
        }

        const delData = ins?.deliveries?.length ? ins?.deliveries : [];
        await this.saveDeliveries(instExist ? instExist : rbi, delData, user.id, version);
      }
    } else {
      await this._resultByIntitutionsRepository.updateGenericIstitutions(result.id, [], 5, user.id);
    }
  }

  protected async saveDeliveries(inst: ResultsByInstitution, deliveries: number[], userId: number, v: Version) {
    await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(inst.id, deliveries, userId);
    for (const deli of deliveries) {
      const deliExist = await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(inst.id, deli);
      if (!deliExist) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.save({
          partner_delivery_type_id: deli,
          result_by_institution_id: inst.id,
          last_updated_by: userId,
          created_by: userId,
          versions_id: v.id
        });
      }
    }
  }

  private async saveInnovationUse(result: Result, user: TokenDto, version: Version, { innovatonUse: crtr }: UpdateInnovationPathwayDto) {
    if (crtr?.actors?.length) {
      const { actors } = crtr;
      actors.map(async (el: ResultActor) => {
        console.log(el)
        let actorExists: ResultActor = null;
        if (el?.actor_type_id) {
          actorExists = await this._resultActorRepository.findOne({ where: { actor_type_id: el.actor_type_id, result_id: result.id } });
        } else if (!actorExists && el?.result_actors_id) {
          actorExists = await this._resultActorRepository.findOne({ where: { result_actors_id: el.result_actors_id, result_id: result.id } });
        } else if (!actorExists) {
          actorExists = await this._resultActorRepository.findOne({ where: { actor_type_id: IsNull(), result_id: result.id } });
        }
        console.log(actorExists)
        if (actorExists) {
          console.log('si', el.is_active == undefined ? true : el.is_active)
          await this._resultActorRepository.update(
            actorExists.result_actors_id,
            {
              actor_type_id: this.isNullData(el?.actor_type_id),
              is_active: el.is_active == undefined ? true : el.is_active,
              men: this.isNullData(el?.men),
              men_youth: this.isNullData(el?.men_youth),
              women: this.isNullData(el?.women),
              women_youth: this.isNullData(el?.women_youth),
              last_updated_by: user.id
            }
          );
        } else {
          console.log('no')
          await this._resultActorRepository.save({
            actor_type_id: el.actor_type_id,
            is_active: el.is_active,
            men: el.men,
            men_youth: el.men_youth,
            women: el.women,
            women_youth: el.women_youth,
            last_updated_by: user.id,
            created_by: user.id,
            result_id: result.id,
            version_id: version.id
          });
        }
      })
    }

    console.log(await this._resultActorRepository.find({ where: { result_id: result.id } }))

    if (crtr?.organization?.length) {
      const { organization } = crtr;
      organization.map(async (el) => {
        let ite: ResultsByInstitutionType = null;
        if (el?.institution_types_id) {
          ite = await this._resultByIntitutionsTypeRepository.getNewResultByInstitutionTypeExists(result.id, el.institution_types_id, 5);
        }

        if (!ite && el?.id) {
          ite = await this._resultByIntitutionsTypeRepository.getNewResultByIdExists(result.id, el.id, 5);
        }
        if (ite) {
          await this._resultByIntitutionsTypeRepository.update(
            ite.id,
            {
              institution_types_id: el.institution_types_id,
              last_updated_by: user.id,
              how_many: el.how_many,
              is_active: el.is_active
            }
          );
        } else {
          await this._resultByIntitutionsTypeRepository.save({
            results_id: result.id,
            created_by: user.id,
            last_updated_by: user.id,
            institution_types_id: el.institution_types_id,
            institution_roles_id: 5,
            how_many: el.how_many,
            version_id: version.id
          })
        }
      })
    }

    if (crtr?.measures?.length) {
      const { measures } = crtr;
      measures.map(async (el) => {
        let ripm: ResultIpMeasure = null;
        if (el?.result_ip_measure_id) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              result_ip_measure_id: el.result_ip_measure_id
            }
          });
        } else if (!ripm && el?.unit_of_measure) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_ip_id: el.result_ip_id
            }
          });
        } else if (!ripm) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_ip_id: el.result_ip_id
            }
          });
        }

        if (ripm) {
          await this._resultIpMeasureRepository.update(
            ripm.result_ip_measure_id,
            {
              unit_of_measure: this.isNullData(el.unit_of_measure),
              quantity: this.isNullData(el.quantity),
              last_updated_by: user.id,
              is_active: el.is_active == undefined ? true : el.is_active
            }
          )
        } else {
          await this._resultIpMeasureRepository.save({
            result_ip_id: result.id,
            unit_of_measure: el.unit_of_measure,
            quantity: el.quantity,
            created_by: user.id,
            last_updated_by: user.id,
            version_id: version.id
          })
        }
      });
    }
  }

  isNullData(data: any) {
    return data == undefined ? null : data;
  }
}
