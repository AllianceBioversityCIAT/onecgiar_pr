import { HttpStatus, Injectable } from '@nestjs/common';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../../results/result.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';
import { ResultRegion } from '../../results/result-regions/entities/result-region.entity';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { InnovationPackagingExpert } from '../innovation-packaging-experts/entities/innovation-packaging-expert.entity';
import { Result } from '../../results/entities/result.entity';
import { Version } from '../../versioning/entities/version.entity';
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
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultCountrySubnational } from '../../results/result-countries-sub-national/entities/result-country-subnational.entity';
import { ResultInnovationPackageService } from '../result-innovation-package/result-innovation-package.service';

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
    protected readonly _resultIpExpertisesRepository: ResultIpExpertisesRepository,
    private readonly _versioningService: VersioningService,
    private readonly _returnResponse: ReturnResponse,
    protected readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    private $_resultInnovationPackageService: ResultInnovationPackageService,
  ) {}

  async getStepOne(resultId: number) {
    try {
      const resultByInnovationPackageId =
        await this._innovationByResultRepository.findOneBy({
          result_innovation_package_id: resultId,
        });

      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true,
        },
      });
      // * Validate if the query incoming empty
      if (!result) {
        return {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const geo_scope_id = result.geographic_scope_id;
      const coreResult =
        await this._innovationByResultRepository.getInnovationCoreStepOne(
          resultId,
        );
      const regions: ResultRegion[] =
        await this._resultRegionRepository.getResultRegionByResultId(resultId);
      const countries: ResultCountry[] =
        await this._resultCountryRepository.getResultCountriesByResultId(
          resultId,
        );
      const eoiOutcomes: ResultIpEoiOutcome[] =
        await this._resultIpEoiOutcomes.getEoiOutcomes(
          resultByInnovationPackageId.result_by_innovation_package_id,
        );
      const actionAreaOutcomes: ResultIpAAOutcome[] =
        await this._resultIpAAOutcomes.getAAOutcomes(
          resultByInnovationPackageId.result_by_innovation_package_id,
        );
      const impactAreas: ResultIpImpactArea[] =
        await this._resultIpImpactAreasRepository.getImpactAreas(
          resultByInnovationPackageId.result_by_innovation_package_id,
        );
      const sdgTargets: ResultIpSdgTargets[] =
        await this._resultIpSdgsTargetsRepository.getSdgs(
          resultByInnovationPackageId.result_by_innovation_package_id,
        );
      const resultInnovationPackage: ResultInnovationPackage[] =
        await this._resultInnovationPackageRepository.findBy({
          result_innovation_package_id: resultId,
          is_active: true,
        });
      const institutions: ResultsByInstitution[] =
        await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
          resultId,
          5,
        );
      const deliveries: ResultByInstitutionsByDeliveriesType[] =
        await await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(
          institutions?.map((el) => el.id),
        );
      institutions?.map((int) => {
        int['deliveries'] = deliveries
          ?.filter((del) => del.result_by_institution_id == int.id)
          .map((del) => del.partner_delivery_type_id);
      });
      const experts = await this._innovationPackagingExpertRepository.find({
        where: {
          result_id: result.id,
          is_active: true,
        },
      });

      const sub_national_counties: ResultCountrySubnational[] =
        await this._resultCountrySubnationalRepository.find({
          where: {
            result_country_id: In(countries.map((el) => el.result_country_id)),
            is_active: true,
          },
          relations: {
            clarisa_subnational_scope_object: true,
          },
        });

      countries.map((el) => {
        el['sub_national'] = sub_national_counties
          .filter((seb) => seb.result_country_id == el.result_country_id)
          .map((el) => el.clarisa_subnational_scope_object);
      });

      experts.map(async (el) => {
        el.expertises = await this._resultIpExpertisesRepository.find({
          where: {
            result_ip_expert_id: el.result_ip_expert_id,
            is_active: true,
          },
          relations: {
            obj_expertises: true,
          },
        });
      });
      const actorsData = await this._resultActorRepository.find({
        where: { result_id: result.id, is_active: true },
        relations: { obj_actor_type: true },
      });
      actorsData.map((el) => {
        el['men_non_youth'] = el.men - el.men_youth;
        el['women_non_youth'] = el.women - el.women_youth;
      });
      const innovatonUse = {
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({
          where: { result_id: result.id, is_active: true },
        }),
        organization: (
          await this._resultByIntitutionsTypeRepository.find({
            where: {
              results_id: result.id,
              institution_roles_id: 5,
              is_active: true,
            },
            relations: {
              obj_institution_types: { obj_parent: { obj_parent: true } },
            },
          })
        ).map((el) => ({
          ...el,
          parent_institution_type_id: el.obj_institution_types?.obj_parent
            ?.obj_parent?.code
            ? el.obj_institution_types?.obj_parent?.obj_parent?.code
            : el.obj_institution_types?.obj_parent?.code || null,
        })),
      };
      const result_ip = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id,
          is_active: true,
        },
      });

      const resInitLead = await this._resultByInitiativesRepository.findOne({
        where: {
          result_id: result.id,
          is_active: true,
          initiative_role_id: 1,
        },
        relations: {
          obj_initiative: true,
        },
      });

      const coreData = await this._innovationByResultRepository.findOne({
        where: {
          result_innovation_package_id: result.id,
          is_active: true,
          ipsr_role_id: 1,
        },
        relations: { obj_result: true },
      });

      const scalig_ambition = {
        title: `2024 Scaling Ambition blurb`,
        body: `By 2024, the ${
          resInitLead?.obj_initiative?.short_name
        } and partners will work together with${this.arrayToStringAnd(
          institutions?.map((el) => el['institutions_name']),
        )} to accomplish the use of ${
          coreData?.obj_result?.title
        } by${this.innovationUseString(
          innovatonUse.actors.map((el) => el),
          innovatonUse.organization.map((el) => el),
          innovatonUse.measures.map((el) => el),
        )}, ${
          geo_scope_id == 1
            ? ''
            : `in ${this.arrayToStringGeoScopeAnd(
                geo_scope_id,
                regions.map((el) => el),
                countries.map((el) => el),
              )}`
        } to contribute achieving ${this.arrayToStringAnd(
          eoiOutcomes?.map((el) => el['title']),
        )}.`,
      };

      const scalingText = scalig_ambition['body'];

      await this._resultInnovationPackageRepository.update(
        { result_innovation_package_id: result.id },
        {
          scaling_ambition_blurb: scalingText,
        },
      );

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
        },
        message: 'Result data',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  innovationUseString(
    ra: ResultActor[],
    ri: ResultsByInstitutionType[],
    rim: ResultIpMeasure[],
  ) {
    const temp_ra = ra.filter((el) =>
      el?.obj_actor_type?.actor_type_id == 5
        ? el?.other_actor_type
        : el?.obj_actor_type?.name && el?.sex_and_age_disaggregation
          ? el?.how_many
          : el?.men && el?.women,
    );
    const temp_ri = ri.filter(
      (el) => el?.obj_institution_types?.name && el?.how_many,
    );
    const temp_rim = rim.filter((el) => el?.unit_of_measure && el?.quantity);

    const temp_string = `${
      temp_ra?.length ? ` ${this.arrayToStringActorsAnd([...temp_ra])}` : ''
    }${
      temp_ri?.length
        ? `${temp_ra?.length ? ',' : ''} ${this.arrayOrganizationToString([
            ...temp_ri,
          ])}`
        : ''
    }${
      temp_rim?.length
        ? `${temp_ri?.length ? ',' : ''} ${this.arrayMeasureToString([
            ...temp_rim,
          ])}`
        : ''
    }`;

    return temp_ri?.length || temp_ra?.length || temp_rim?.length
      ? temp_string
      : ' <Innovation use not provided>';
  }

  arrayOrganizationToString(arrayData: ResultsByInstitutionType[]) {
    const count = arrayData?.length;
    if (!count) {
      return '<Data not provided>';
    }
    const lastElement = arrayData.pop();
    let actors = '';
    for (const i of arrayData) {
      actors += `${i?.how_many} ${
        i?.obj_institution_types?.name || `<Institution type not provided>`
      }${arrayData?.length > 1 ? ',' : ''} `;
    }
    return `${actors.replace(/(,.)$/, '')} ${
      count > 1 ? 'and ' : ''
    }${lastElement?.how_many} ${
      lastElement?.obj_institution_types?.name ||
      `<Institution type not provided>`
    }`;
  }

  arrayMeasureToString(arrayData: ResultIpMeasure[]) {
    const count = arrayData?.length;
    if (!count) {
      return '<Data not provided>';
    }
    const lastElement = arrayData.pop();
    let actors = '';
    for (const i of arrayData) {
      actors += `${+i?.quantity} ${
        i?.unit_of_measure || `<Unit of measure not provided>`
      }${arrayData?.length > 1 ? ',' : ''} `;
    }
    return `${actors.replace(/(,.)$/, '')} ${
      count > 1 ? 'and ' : ''
    }${+lastElement?.quantity} ${
      lastElement?.unit_of_measure || `<Unit of measure not provided>`
    }`;
  }

  arrayToStringAnd(arrayData: any[]) {
    const count = arrayData?.length;
    const lastElement = arrayData.pop();
    return count
      ? ` ${arrayData.toString().replace(/,/g, ', ')}${
          count > 1 ? ' and' : ''
        } ${lastElement}`
      : ' <Data not provided>';
  }

  arrayToStringGeoScopeAnd(
    geoId: number,
    r: ResultRegion[],
    c: ResultCountry[],
  ) {
    let returnData = '';
    if (geoId == 1) {
      return;
    } else if (geoId == 2) {
      returnData = this.arrayToStringAnd(r.map((el) => el['name']));
    } else if (geoId == 3 || geoId == 4) {
      returnData = this.arrayToStringAnd(c.map((el) => el['name']));
    } else if (geoId == 5) {
      returnData = ' <Data not provided>';
    }

    return returnData;
  }

  arrayToStringActorsAnd(arrayData: ResultActor[]) {
    const count = arrayData?.length;
    if (!count) {
      return '<Data not provided>';
    }
    const lastElement = arrayData.pop();
    let actors = '';
    for (const i of arrayData) {
      actors += `${
        i?.sex_and_age_disaggregation
          ? +i.how_many
          : `${i.women} women (${i.women_youth} youth / ${
              +i.women - +i.women_youth
            } non-youth) & ${i.men} men (${i.men_youth} youth / ${
              +i.men - +i.men_youth
            } non-youth)`
      } ${
        i?.obj_actor_type?.actor_type_id == 5
          ? i?.other_actor_type
          : i?.obj_actor_type?.name || `<Actor type not provided>`
      }${arrayData?.length > 1 ? ',' : ''} `;
    }
    return `${actors.replace(/(,.)$/, '')} ${count > 1 ? 'and ' : ''}${
      lastElement?.sex_and_age_disaggregation
        ? +lastElement.how_many
        : `${lastElement.women} women (${lastElement.women_youth} youth / ${
            +lastElement.women - +lastElement.women_youth
          } non-youth) & ${lastElement.men} men (${
            lastElement.men_youth
          } youth / ${+lastElement.men - +lastElement.men_youth} non-youth)`
    } ${
      lastElement?.obj_actor_type?.actor_type_id == 5
        ? lastElement?.other_actor_type
        : lastElement?.obj_actor_type?.name || `<Actor type not provided>`
    }`;
  }

  async updateMain(
    resultId: number,
    UpdateInnovationPathwayDto: UpdateInnovationPathwayDto,
    user: TokenDto,
  ) {
    try {
      // * Check if result already exists
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true,
        },
      });
      // * Validate if the query incoming empty
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.IPSR,
      );
      if (!version) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      const scalingText = UpdateInnovationPathwayDto.scalig_ambition['body'];

      const scalingAmbitionBlurb =
        await this._resultInnovationPackageRepository.update(
          { result_innovation_package_id: result.id },
          {
            scaling_ambition_blurb: scalingText,
          },
        );

      const specifyAspiredOutcomesAndImpact =
        await this.saveSpecifyAspiredOutcomesAndImpact(
          result,
          UpdateInnovationPathwayDto,
          user,
        );
      const actionAreaOutcomes = await this.saveActionAreaOutcomes(
        result,
        version,
        UpdateInnovationPathwayDto,
        user,
      );
      const impactAreas = await this.saveImpactAreas(
        result,
        version,
        UpdateInnovationPathwayDto,
        user,
      );
      const sdgTargets = await this.saveSdgTargets(
        result,
        version,
        UpdateInnovationPathwayDto,
        user,
      );
      const experts = await this.saveInnovationPackagingExperts(
        result,
        version,
        user,
        UpdateInnovationPathwayDto,
      );
      const consensus = await this.saveConsensus(
        result,
        user,
        version,
        UpdateInnovationPathwayDto.result_ip,
      );
      const partners = await this.savePartners(
        result,
        user,
        version,
        UpdateInnovationPathwayDto,
      );
      const innovationUse = await this.saveInnovationUse(
        result,
        user,
        version,
        UpdateInnovationPathwayDto,
      );
      const geoScope = await this.saveGeoScope(
        result,
        UpdateInnovationPathwayDto,
        user,
      );

      return {
        response: [
          scalingAmbitionBlurb,
          specifyAspiredOutcomesAndImpact,
          actionAreaOutcomes,
          impactAreas,
          sdgTargets,
          experts,
          consensus,
          partners,
          innovationUse,
          geoScope,
        ],
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveGeoScope(
    result: Result,
    UpdateInnovationPathwayDto: UpdateInnovationPathwayDto,
    user: TokenDto,
  ) {
    try {
      const regions = UpdateInnovationPathwayDto.regions;
      const countries = UpdateInnovationPathwayDto.countries;
      const resultId = result.id;
      const geoScopeId = UpdateInnovationPathwayDto.geo_scope_id;

      const resultRegions: ResultRegion[] = [];

      const coreResult = await this._innovationByResultRepository.findOneBy({
        result_innovation_package_id: resultId,
        ipsr_role_id: 1,
        is_active: true,
      });

      let coreTitle = await this._resultRepository.findOne({
        where: { id: coreResult.result_id },
      });

      await this._resultRegionRepository.update(
        { result_id: resultId },
        {
          is_active: false,
        },
      );
      const existCountries = await this._resultCountryRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      for (const c of existCountries) {
        await this._resultCountryRepository.update(c.result_country_id, {
          is_active: false,
        });

        await this._resultCountrySubnationalRepository.find({
          where: {
            result_country_id: c.result_country_id,
            is_active: true,
          },
        });
      }

      let innovationTitle = '';
      if (geoScopeId === 2) {
        if (regions) {
          for (const r of regions) {
            const newRegions = new ResultRegion();
            newRegions.result_id = resultId;
            newRegions.region_id = r.id;
            newRegions.is_active = true;
            resultRegions.push(newRegions);
          }
        }
        const regionsList = regions.map((r) => r.name);
        if (coreTitle.title.endsWith('.')) {
          coreTitle.title = coreTitle.title.replace(/\.$/, '');
        }
        innovationTitle = `Innovation Package and Scaling Readiness assessment for ${coreTitle.title} in ${regionsList.slice(0, -1).join(', ')}${
          regionsList.length > 1 ? ' and ' : ''
        }${regionsList[regionsList.length - 1]}`;
      } else if ([3, 4, 5].includes(geoScopeId)) {
        if (countries) {
          const countriesList = countries.map((c) => c.name);
          if (result.title.endsWith('.')) {
            result.title = result.title.replace(/\.$/, '');
          }
          innovationTitle = `Innovation Package and Scaling Readiness assessment for ${coreTitle.title.toLocaleLowerCase()} in ${countriesList
            .slice(0, -1)
            .join(', ')}${countriesList.length > 1 ? ' and ' : ''}${
            countriesList[countriesList.length - 1]
          }`;
          for (const ct of countries) {
            const newRc = await this._resultCountryRepository.save({
              result_id: resultId,
              country_id: ct.id,
            });

            const newInnovationCountries: ResultCountry[] = [];
            newInnovationCountries.push(newRc);
            
            if (geoScopeId === 5 && ct?.sub_national?.length) {
              await this.$_resultInnovationPackageService.saveSubNational(
                newRc.result_country_id,
                ct.sub_national,
                user,
              );
            }
          }
        }
      } else {
        if (coreTitle.title.endsWith('.')) {
          coreTitle.title = coreTitle.title.replace(/\.$/, '');
        }
        innovationTitle = `Innovation Package and Scaling Readiness assessment for ${coreTitle.title.toLocaleLowerCase().trim()}.`;
      }

      await this._resultRepository.update(resultId, {
        geographic_scope_id: geoScopeId,
        title: innovationTitle,
      });
      await this._resultRegionRepository.save(resultRegions);

      return {
        response: { status: 'Success' },
        message: 'The Geo Scope was saved correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSpecifyAspiredOutcomesAndImpact(
    result: any,
    UpdateInnovationPathwayDto: UpdateInnovationPathwayDto,
    user: TokenDto,
  ) {
    const id = result.id;
    try {
      const resultByInnovationPackageId =
        await this._innovationByResultRepository.findOneBy({
          result_innovation_package_id: id,
        });
      const result_by_innovation_package_id =
        resultByInnovationPackageId.result_by_innovation_package_id;
      const eoiOutcomes = UpdateInnovationPathwayDto.eoiOutcomes;

      for (const eoi of eoiOutcomes) {
        const eoiExist = await this._resultIpEoiOutcomes.findOne({
          where: {
            result_by_innovation_package_id,
            toc_result_id: eoi.toc_result_id,
            is_active: true,
          },
        });

        if (!eoiExist) {
          const newEoi = new ResultIpEoiOutcome();
          newEoi.toc_result_id = eoi.toc_result_id;
          newEoi.result_by_innovation_package_id =
            result_by_innovation_package_id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          await this._resultIpEoiOutcomes.save(newEoi);
        } else {
          await this._resultIpEoiOutcomes.update(
            eoiExist?.result_ip_eoi_outcome_id,
            {
              is_active: true,
              last_updated_by: user.id,
              last_updated_date: new Date(),
            },
          );
        }
      }

      const allTocByResult = await this._resultIpEoiOutcomes.find({
        where: {
          result_by_innovation_package_id: result_by_innovation_package_id,
          is_active: true,
        },
      });

      for (const toc of allTocByResult) {
        const exist = eoiOutcomes.some(
          (eoi) => eoi.toc_result_id === toc.toc_result_id,
        );

        if (!exist) {
          await this._resultIpEoiOutcomes.update(toc.result_ip_eoi_outcome_id, {
            is_active: false,
            last_updated_by: user.id,
          });
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The EOI Outcomes have been saved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveActionAreaOutcomes(
    result: any,
    version: Version,
    UpdateInnovationPathwayDto: UpdateInnovationPathwayDto,
    user: TokenDto,
  ) {
    const id = result.id;
    try {
      const resultByInnovationPackageId =
        await this._innovationByResultRepository.findOneBy({
          result_innovation_package_id: id,
        });
      const result_by_innovation_package_id =
        resultByInnovationPackageId.result_by_innovation_package_id;
      const aaOutcomes = UpdateInnovationPathwayDto.actionAreaOutcomes;

      const allAAOutcome = await this._resultIpAAOutcomes.find({
        where: {
          result_by_innovation_package_id: result_by_innovation_package_id,
        },
      });

      const existingIds = allAAOutcome.map((et) => et.action_area_outcome_id);

      const aaToActive = allAAOutcome.filter(
        (eoi) =>
          aaOutcomes.find(
            (e) => e.action_area_outcome_id === eoi.action_area_outcome_id,
          ) && eoi.is_active === false,
      );

      const aaToInactive = allAAOutcome.filter(
        (eoi) =>
          !aaOutcomes.find(
            (e) => e.action_area_outcome_id === eoi.action_area_outcome_id,
          ) && eoi.is_active === true,
      );

      const aaToSave = aaOutcomes.filter(
        (eoi) => !existingIds.includes(eoi.action_area_outcome_id),
      );

      const saveActionAreas = [];

      if (aaToSave?.length > 0) {
        for (const entity of aaToSave) {
          const newEoi = new ResultIpAAOutcome();
          newEoi.action_area_outcome_id = entity.action_area_outcome_id;
          newEoi.result_by_innovation_package_id =
            result_by_innovation_package_id;
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
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveImpactAreas(
    result: any,
    version: Version,
    UpdateInnovationPathwayDto: UpdateInnovationPathwayDto,
    user: TokenDto,
  ) {
    const id = result.id;
    try {
      const resultByInnovationPackageId =
        await this._innovationByResultRepository.findOneBy({
          result_innovation_package_id: id,
        });
      const result_by_innovation_package_id =
        resultByInnovationPackageId.result_by_innovation_package_id;
      const impactAreas = UpdateInnovationPathwayDto.impactAreas;

      const allImpactAreas = await this._resultIpImpactAreasRepository.find({
        where: {
          result_by_innovation_package_id: result_by_innovation_package_id,
        },
      });

      const existingIds = allImpactAreas.map(
        (et) => et.impact_area_indicator_id,
      );

      const impactAreasToActive = allImpactAreas.filter(
        (ia) =>
          impactAreas.find((e) => e.targetId === ia.impact_area_indicator_id) &&
          ia.is_active === false,
      );

      const impactAreasToInactive = allImpactAreas.filter(
        (ia) =>
          !impactAreas.find(
            (e) => e.targetId === ia.impact_area_indicator_id,
          ) && ia.is_active === true,
      );

      const impactAreasToSave = impactAreas.filter(
        (ia) => !existingIds.includes(ia.targetId),
      );

      const saveImpactAreas = [];

      if (impactAreasToSave?.length > 0) {
        for (const entity of impactAreasToSave) {
          const newEoi = new ResultIpImpactArea();
          newEoi.impact_area_indicator_id = entity.targetId;
          newEoi.result_by_innovation_package_id =
            result_by_innovation_package_id;
          newEoi.created_by = user.id;
          newEoi.last_updated_by = user.id;
          newEoi.created_date = new Date();
          newEoi.last_updated_date = new Date();
          saveImpactAreas.push(
            this._resultIpImpactAreasRepository.save(newEoi),
          );
        }
      }

      if (impactAreasToActive?.length > 0) {
        for (const entity of impactAreasToActive) {
          entity.is_active = true;
          saveImpactAreas.push(
            this._resultIpImpactAreasRepository.save(entity),
          );
        }
      }

      if (impactAreasToInactive?.length > 0) {
        for (const entity of impactAreasToInactive) {
          entity.is_active = false;
          saveImpactAreas.push(
            this._resultIpImpactAreasRepository.save(entity),
          );
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The Impact Areas have been saved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveSdgTargets(
    result: any,
    version: Version,
    UpdateInnovationPathwayDto: UpdateInnovationPathwayDto,
    user: TokenDto,
  ) {
    const id = result.id;
    try {
      const sdgsTargets: ResultIpSdgTargets[] = [];
      const resultByInnovationPackageId =
        await this._innovationByResultRepository.findOneBy({
          result_innovation_package_id: id,
        });
      const sdgs = UpdateInnovationPathwayDto.sdgTargets;

      await this._resultIpSdgsTargetsRepository.updateSdg(
        resultByInnovationPackageId.result_by_innovation_package_id,
        sdgs.map((c) => c.id),
        user.id,
      );
      if (sdgs?.length) {
        for (let i = 0; i < sdgs.length; i++) {
          const sdgExist =
            await this._resultIpSdgsTargetsRepository.getSdgsByIpAndSdgId(
              resultByInnovationPackageId.result_by_innovation_package_id,
              sdgs[i].id,
            );

          if (!sdgExist) {
            const newSdgs = new ResultIpSdgTargets();
            newSdgs.clarisa_sdg_target_id = sdgs[i].id;
            newSdgs.clarisa_sdg_usnd_code = sdgs[i].usnd_code;
            newSdgs.result_by_innovation_package_id =
              resultByInnovationPackageId.result_by_innovation_package_id;
            newSdgs.created_by = user.id;
            newSdgs.last_updated_by = user.id;
            newSdgs.created_date = new Date();
            newSdgs.last_updated_date = new Date();
            sdgsTargets.push(newSdgs);
          }

          await this._resultIpSdgsTargetsRepository.save(sdgsTargets);
        }
      }

      return {
        response: { status: 'Success' },
        message: 'The SDGs have been saved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async saveInnovationPackagingExperts(
    result: Result,
    v: Version,
    user: TokenDto,
    { result_ip: rpData, experts }: UpdateInnovationPathwayDto,
  ) {
    const rip = await this._resultInnovationPackageRepository.findOne({
      where: {
        result_innovation_package_id: result.id,
      },
    });

    if (rip) {
      this._resultInnovationPackageRepository.update(result.id, {
        last_updated_by: user.id,
        experts_is_diverse: rpData?.experts_is_diverse,
        is_not_diverse_justification: !rpData?.experts_is_diverse
          ? rpData?.is_not_diverse_justification
          : null,
      });
    } else {
      this._resultInnovationPackageRepository.save({
        result_innovation_package_id: result.id,
        last_updated_by: user.id,
        created_by: user.id,
        experts_is_diverse: rpData?.experts_is_diverse,
        is_not_diverse_justification: !rpData?.experts_is_diverse
          ? rpData?.is_not_diverse_justification
          : null,
      });
    }

    if (experts?.length) {
      for (const ex of experts) {
        let innExp: InnovationPackagingExpert = null;
        if (ex?.result_ip_expert_id) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              result_ip_expert_id: ex.result_ip_expert_id,
              result_id: result.id,
            },
          });
        } else if (!innExp && ex?.first_name && ex?.last_name) {
          innExp = await this._innovationPackagingExpertRepository.findOne({
            where: {
              email: IsNull(),
              first_name: ex.first_name,
              last_name: ex.last_name,
              result_id: result.id,
            },
          });
        }

        if (innExp) {
          await this._innovationPackagingExpertRepository.update(
            innExp.result_ip_expert_id,
            {
              first_name: ex?.first_name,
              last_name: ex?.last_name,
              is_active: ex.is_active == undefined ? true : ex.is_active,
              email: ex?.email,
              last_updated_by: user.id,
              expertises_id: ex?.expertises_id,
              organization_id: ex?.organization_id,
            },
          );
        } else {
          innExp = await this._innovationPackagingExpertRepository.save({
            first_name: ex?.first_name,
            last_name: ex?.last_name,
            is_active: ex?.is_active,
            email: ex?.email,
            last_updated_by: user.id,
            created_by: user.id,
            expertises_id: ex?.expertises_id,
            organization_id: ex?.organization_id,
            result_id: result.id,
          });
        }

        await this.saveExpertises(
          ex.expertises,
          innExp.result_ip_expert_id,
          user,
        );
      }
    }
  }

  private async saveExpertises(
    exps: ResultIpExpertises[],
    result_ip_expert_id: number,
    user: TokenDto,
  ) {
    await exps.map(async (el) => {
      let riesEx: ResultIpExpertises = null;
      if (el?.result_ip_expertises_id) {
        riesEx = await this._resultIpExpertisesRepository.findOne({
          where: {
            result_ip_expertises_id: el?.result_ip_expertises_id,
          },
        });
      } else if (el?.expertises_id) {
        riesEx = await this._resultIpExpertisesRepository.findOne({
          where: {
            expertises_id: el.expertises_id,
            result_ip_expert_id: result_ip_expert_id,
          },
        });
      }

      if (riesEx) {
        await this._resultIpExpertisesRepository.update(
          riesEx.result_ip_expertises_id,
          {
            is_active: el.is_active == undefined ? true : el.is_active,
            expertises_id: el.expertises_id,
            last_updated_by: user.id,
          },
        );
      } else {
        await this._resultIpExpertisesRepository.save({
          created_by: user.id,
          last_updated_by: user.id,
          expertises_id: el.expertises_id,
          result_ip_expert_id: result_ip_expert_id,
        });
      }
    });
  }

  private async saveConsensus(
    result: Result,
    user: TokenDto,
    version: Version,
    rip: CreateResultIPDto,
  ) {
    try {
      const ripExists = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id,
        },
      });
      if (ripExists) {
        await this._resultInnovationPackageRepository.update(
          ripExists.result_innovation_package_id,
          {
            active_backstopping_id: rip.active_backstopping_id,
            consensus_initiative_work_package_id:
              rip.consensus_initiative_work_package_id,
            regional_integrated_id: rip.regional_integrated_id,
            relevant_country_id: rip.relevant_country_id,
            regional_leadership_id: rip.regional_leadership_id,
            is_active: true,
            last_updated_by: user.id,
          },
        );
      } else {
        await this._resultInnovationPackageRepository.save({
          result_innovation_package_id: result.id,
          active_backstopping_id: rip.active_backstopping_id,
          consensus_initiative_work_package_id:
            rip.consensus_initiative_work_package_id,
          regional_integrated_id: rip.regional_integrated_id,
          relevant_country_id: rip.relevant_country_id,
          regional_leadership_id: rip.regional_leadership_id,
          created_by: user.id,
          last_updated_by: user.id,
        });
      }
      const res = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: result.id,
        },
      });
      return res;
    } catch (error) {
      return null;
    }
  }

  private async savePartners(
    result: Result,
    user: TokenDto,
    version: Version,
    crtr: UpdateInnovationPathwayDto,
  ) {
    if (crtr?.institutions?.length) {
      const { institutions: inst } = crtr;
      await this._resultByIntitutionsRepository.updateGenericIstitutions(
        result.id,
        inst,
        5,
        user.id,
      );
      for (const ins of inst) {
        const instExist =
          await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
            result.id,
            ins.institutions_id,
            5,
          );
        let rbi: ResultsByInstitution = null;
        if (!instExist) {
          rbi = await this._resultByIntitutionsRepository.save({
            institution_roles_id: 5,
            institutions_id: ins.institutions_id,
            result_id: result.id,
            created_by: user.id,
            last_updated_by: user.id,
          });
        }

        const delData = ins?.deliveries?.length ? ins?.deliveries : [];
        await this.saveDeliveries(
          instExist ? instExist : rbi,
          delData,
          user.id,
          version,
        );
      }
    } else {
      await this._resultByIntitutionsRepository.updateGenericIstitutions(
        result.id,
        [],
        5,
        user.id,
      );
    }
  }

  protected async saveDeliveries(
    inst: ResultsByInstitution,
    deliveries: number[],
    userId: number,
    v: Version,
  ) {
    await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(
      inst.id,
      deliveries,
      userId,
    );
    for (const deli of deliveries) {
      const deliExist =
        await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(
          inst.id,
          deli,
        );
      if (!deliExist) {
        await this._resultByInstitutionsByDeliveriesTypeRepository.save({
          partner_delivery_type_id: deli,
          result_by_institution_id: inst.id,
          last_updated_by: userId,
          created_by: userId,
          versions_id: v.id,
        });
      }
    }
  }

  private async saveInnovationUse(
    result: Result,
    user: TokenDto,
    version: Version,
    { innovatonUse: crtr }: UpdateInnovationPathwayDto,
  ) {
    if (crtr?.actors?.length) {
      const { actors } = crtr;
      actors.map(async (el: ResultActor) => {
        let actorExists: ResultActor = null;

        if (el.sex_and_age_disaggregation === true && !el.how_many) {
          return {
            response: { status: 'Error' },
            message: 'The field how many is required',
            status: HttpStatus.BAD_REQUEST,
          };
        }

        if (el?.actor_type_id) {
          const { actor_type_id } = el;
          const whereOptions: any = {
            actor_type_id: el.actor_type_id,
            result_id: result.id,
            result_actors_id: el.result_actors_id ?? IsNull(),
            is_active: true,
          };

          if (!el?.result_actors_id) {
            switch (`${actor_type_id}`) {
              case '5':
                whereOptions.other_actor_type =
                  el?.other_actor_type || IsNull();
                break;
            }
          } else {
            delete whereOptions.actor_type_id;
          }
          actorExists = await this._resultActorRepository.findOne({
            where: whereOptions,
          });
        } else if (!actorExists && el?.result_actors_id) {
          actorExists = await this._resultActorRepository.findOne({
            where: {
              result_actors_id: el.result_actors_id,
              result_id: result.id,
            },
          });
        } else if (!actorExists) {
          actorExists = await this._resultActorRepository.findOne({
            where: { actor_type_id: IsNull(), result_id: result.id },
          });
        }

        if (actorExists) {
          if (!el?.actor_type_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultActorRepository.update(
            actorExists.result_actors_id,
            {
              actor_type_id: this.isNullData(el?.actor_type_id),
              is_active: el.is_active == undefined ? true : el.is_active,
              men: this.isNullData(el?.men),
              men_youth: this.isNullData(el?.men_youth),
              women: this.isNullData(el?.women),
              women_youth: this.isNullData(el?.women_youth),
              last_updated_by: user.id,
              other_actor_type: this.isNullData(el?.other_actor_type),
              sex_and_age_disaggregation:
                el?.sex_and_age_disaggregation === true ? true : false,
              how_many: el?.how_many,
            },
          );
        } else {
          if (!el?.actor_type_id) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultActorRepository.save({
            actor_type_id: el.actor_type_id,
            is_active: el.is_active,
            men: el.men,
            men_youth: el.men_youth,
            women: el.women,
            women_youth: el.women_youth,
            other_actor_type: el.other_actor_type,
            last_updated_by: user.id,
            created_by: user.id,
            result_id: result.id,
            sex_and_age_disaggregation:
              el?.sex_and_age_disaggregation === true ? true : false,
            how_many: el?.how_many,
          });
        }
      });
    }

    if (crtr?.organization?.length) {
      const { organization } = crtr;
      organization.map(async (el) => {
        let ite: ResultsByInstitutionType = null;

        if (el?.institution_types_id && el?.institution_types_id != 78) {
          ite =
            await this._resultByIntitutionsTypeRepository.getNewResultByInstitutionTypeExists(
              result.id,
              el.institution_types_id,
              5,
            );
        }

        if (!ite && el?.id) {
          ite =
            await this._resultByIntitutionsTypeRepository.getNewResultByIdExists(
              result.id,
              el.id,
              5,
            );
        }

        if (ite) {
          if (!el?.institution_types_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field institution type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          } else {
            await this._resultByIntitutionsTypeRepository.update(ite.id, {
              institution_types_id: el.institution_types_id,
              last_updated_by: user.id,
              other_institution: el?.other_institution,
              how_many: el?.how_many,
              is_active: el?.is_active,
              graduate_students: el?.graduate_students,
            });
          }
        } else {
          if (!el?.institution_types_id) {
            return {
              response: { status: 'Error' },
              message: 'The field institution type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultByIntitutionsTypeRepository.save({
            results_id: result.id,
            created_by: user.id,
            last_updated_by: user.id,
            other_institution: el?.other_institution,
            institution_types_id: el.institution_types_id,
            graduate_students: el?.graduate_students,
            institution_roles_id: 5,
            how_many: el.how_many,
          });
        }
      });
    }

    if (crtr?.measures?.length) {
      const { measures } = crtr;
      measures.map(async (el) => {
        let ripm: ResultIpMeasure = null;
        if (el?.result_ip_measure_id) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              result_ip_measure_id: el.result_ip_measure_id,
            },
          });
        } else if (!ripm && el?.unit_of_measure) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_id: result.id,
            },
          });
        } else if (!ripm) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_id: result.id,
            },
          });
        }

        if (ripm) {
          if (!el?.unit_of_measure && el?.is_active != false) {
            return {
              response: { valid: false },
              message: 'The field Unit of Measure is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultIpMeasureRepository.update(
            ripm.result_ip_measure_id,
            {
              unit_of_measure: this.isNullData(el.unit_of_measure),
              quantity: this.isNullData(el.quantity),
              last_updated_by: user.id,
              is_active: el.is_active == undefined ? true : el.is_active,
            },
          );
        } else {
          if (!el?.unit_of_measure || !el?.quantity || el?.quantity == null) {
            return {
              response: { valid: false },
              message: 'The field Unit of Measure and Quantity is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultIpMeasureRepository.save({
            result_id: result.id,
            unit_of_measure: el.unit_of_measure,
            quantity: el.quantity,
            created_by: user.id,
            last_updated_by: user.id,
          });
        }
      });
    }
  }

  isNullData(data: any) {
    return data == undefined ? null : data;
  }

  async retrieveAaOutcomes(resultId: number, user: TokenDto) {
    try {
      const resultExist = await this._resultRepository.findOne({
        where: { id: resultId, is_active: true },
      });

      if (!resultExist) {
        return {
          response: { valid: false },
          message: 'The result does not exist',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const resultIp = await this._resultInnovationPackageRepository.findOne({
        where: {
          result_innovation_package_id: resultId,
          is_active: true,
        },
      });

      const resultByIp = await this._innovationByResultRepository.findOne({
        where: {
          result_innovation_package_id: resultIp.result_innovation_package_id,
          is_active: true,
          ipsr_role_id: 1,
        },
      });

      if (!resultIp || !resultByIp) {
        return {
          response: { valid: false },
          message: 'The result innovation package does not exist',
          statusCode: HttpStatus.NOT_FOUND,
        };
      }

      const searchAaOutcomes = await this._resultIpAAOutcomes.find({
        where: {
          result_by_innovation_package_id:
            resultByIp.result_by_innovation_package_id,
          is_active: true,
        },
      });

      if (searchAaOutcomes.length) {
        for (const aa of searchAaOutcomes) {
          await this._resultIpAAOutcomes.update(
            aa.result_ip_action_area_outcome_id,
            {
              last_updated_by: user.id,
              is_active: false,
            },
          );
        }
      }

      // SEARCH CORE INITIATIVE
      const coreResultInitiative =
        await this._resultByInitiativesRepository.findOne({
          where: {
            result_id: resultByIp.result_id,
            is_active: true,
            initiative_role_id: 1,
          },
        });

      const retrieve = await this._resultIpAAOutcomes.retrieveAaOutcomes(
        coreResultInitiative.result_id,
        coreResultInitiative.initiative_id,
        resultByIp.result_by_innovation_package_id,
        user.id,
      );

      return {
        response: retrieve,
        message: 'The retrieve of Action Areas has been successfully completed',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
