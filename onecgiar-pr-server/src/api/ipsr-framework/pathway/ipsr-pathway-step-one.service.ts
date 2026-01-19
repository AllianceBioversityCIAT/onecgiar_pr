import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegion } from '../../results/result-regions/entities/result-region.entity';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { ResultInnovationPackageRepository } from '../../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { IpsrRepository } from '../../ipsr/ipsr.repository';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from '../../ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { ResultIpEoiOutcomeRepository } from '../../ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpEoiOutcome } from '../../ipsr/innovation-pathway/entities/result-ip-eoi-outcome.entity';
import { ResultIpAAOutcomeRepository } from '../../ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultIpImpactAreaRepository } from '../../ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { In } from 'typeorm';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../../ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';

@Injectable()
export class IpsrPathwayStepOneService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
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
    protected readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    protected readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    protected readonly _resultIpExpertWorkshopRepository: ResultIpExpertWorkshopOrganizedRepostory,
    protected readonly _evidenceRepository: EvidencesRepository,
  ) {}

  async getStepOne(resultId: number) {
    try {
      const result = await this._loadBaseData(resultId);
      if (!result) {
        return {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const geo_scope_id = result.geographic_scope_id;
      const [
        coreResult,
        regions,
        countries,
        eoiOutcomes,
        resultInnovationPackage,
      ] = await this._loadGeographicAndCoreData(resultId);

      const institutions = await this._loadAndProcessInstitutions(resultId);
      const countriesWithSubnational =
        await this._processCountriesSubnational(countries);
      const innovatonUse = await this._loadInnovationUseData(result.id);
      const result_ip = await this._loadResultInnovationPackage(result.id);
      const [resInitLead, coreData] = await this._loadInitiativeAndCoreData(
        result.id,
      );

      const scalig_ambition = this._buildScalingAmbition({
        resInitLead,
        institutions,
        coreData,
        innovatonUse,
        geo_scope_id,
        regions,
        countries: countriesWithSubnational,
        eoiOutcomes,
      });

      await this._resultInnovationPackageRepository.update(
        { result_innovation_package_id: result.id },
        { scaling_ambition_blurb: scalig_ambition.body },
      );

      const [
        link_workshop_list,
        result_ip_expert_workshop_organized,
        result_core,
      ] = await this._loadFinalData(resultId, result_ip);

      return {
        response: {
          result_id: result.id,
          scalig_ambition,
          geo_scope_id,
          coreResult,
          result_ip,
          institutions,
          innovatonUse,
          result,
          regions,
          countries: countriesWithSubnational,
          eoiOutcomes,
          resultInnovationPackage,
          result_ip_expert_workshop_organized,
          link_workshop_list: link_workshop_list?.link,
          result_ip_result_core: result_core,
        },
        message: 'Result data',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async _loadBaseData(resultId: number) {
    return await this._resultRepository.findOne({
      where: { id: resultId, is_active: true },
    });
  }

  private async _loadGeographicAndCoreData(resultId: number) {
    const resultByInnovationPackageId =
      await this._innovationByResultRepository.findOneBy({
        result_innovation_package_id: resultId,
      });

    return Promise.all([
      this._innovationByResultRepository.getInnovationCoreStepOne(resultId),
      this._resultRegionRepository.getResultRegionByResultId(resultId),
      this._resultCountryRepository.getResultCountriesByResultId(resultId),
      this._resultIpEoiOutcomes.getEoiOutcomes(
        resultByInnovationPackageId.result_by_innovation_package_id,
      ),
      this._resultInnovationPackageRepository.findBy({
        result_innovation_package_id: resultId,
        is_active: true,
      }),
    ]);
  }

  private async _loadAndProcessInstitutions(
    resultId: number,
  ): Promise<ResultsByInstitution[]> {
    const institutions =
      await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
        resultId,
        5,
      );
    const deliveries =
      await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(
        institutions?.map((el) => el.id),
      );

    institutions?.forEach((int) => {
      int['deliveries'] = deliveries
        ?.filter((del) => del.result_by_institution_id == int.id)
        .map((del) => del.partner_delivery_type_id);
    });

    return institutions;
  }

  private async _processCountriesSubnational(
    countries: ResultCountry[],
  ): Promise<ResultCountry[]> {
    const sub_national_counties =
      await this._resultCountrySubnationalRepository.find({
        where: {
          result_country_id: In(countries.map((el) => el.result_country_id)),
          is_active: true,
        },
        relations: { clarisa_subnational_scope_object: true },
      });

    countries.forEach((el) => {
      el['sub_national'] = sub_national_counties
        .filter((seb) => seb.result_country_id == el.result_country_id)
        .map((el) => el.clarisa_subnational_scope_object);
    });

    return countries;
  }

  private async _loadInnovationUseData(resultId: number) {
    const actorsData = await this._resultActorRepository.find({
      where: { result_id: resultId, is_active: true },
      relations: { obj_actor_type: true },
    });

    actorsData.forEach((el) => {
      el['men_non_youth'] = el.men - el.men_youth;
      el['women_non_youth'] = el.women - el.women_youth;
    });

    const organization = await this._resultByIntitutionsTypeRepository.find({
      where: {
        results_id: resultId,
        institution_roles_id: 5,
        is_active: true,
      },
      relations: {
        obj_institution_types: { obj_parent: { obj_parent: true } },
      },
    });

    return {
      actors: actorsData,
      measures: await this._resultIpMeasureRepository.find({
        where: { result_id: resultId, is_active: true },
      }),
      organization: organization.map((el) => ({
        ...el,
        parent_institution_type_id: el.obj_institution_types?.obj_parent
          ?.obj_parent?.code
          ? el.obj_institution_types?.obj_parent?.obj_parent?.code
          : el.obj_institution_types?.obj_parent?.code || null,
      })),
    };
  }

  private async _loadResultInnovationPackage(resultId: number) {
    return await this._resultInnovationPackageRepository.findOne({
      where: {
        result_innovation_package_id: resultId,
        is_active: true,
      },
    });
  }

  private async _loadInitiativeAndCoreData(resultId: number) {
    return Promise.all([
      this._resultByInitiativesRepository.findOne({
        where: {
          result_id: resultId,
          is_active: true,
          initiative_role_id: 1,
        },
        relations: { obj_initiative: true },
      }),
      this._innovationByResultRepository.findOne({
        where: {
          result_innovation_package_id: resultId,
          is_active: true,
          ipsr_role_id: 1,
        },
        relations: { obj_result: true },
      }),
    ]);
  }

  private _buildGeoScopeString(
    geo_scope_id: number,
    regions: ResultRegion[],
    countries: ResultCountry[],
  ): string {
    if (
      geo_scope_id === 1 ||
      geo_scope_id === undefined ||
      geo_scope_id === null
    ) {
      return '';
    }

    if (geo_scope_id === 2) {
      return regions && regions.length > 0
        ? `in ${this.arrayToStringGeoScopeAnd(geo_scope_id, regions, countries)}`
        : 'in <Regions not provided>';
    }

    if (geo_scope_id === 3 || geo_scope_id === 4) {
      return countries && countries.length > 0
        ? `in ${this.arrayToStringGeoScopeAnd(geo_scope_id, regions, countries)}`
        : 'in <Countries not provided>';
    }

    return `in ${this.arrayToStringGeoScopeAnd(geo_scope_id, regions, countries)}`;
  }

  private _buildScalingAmbition(params: {
    resInitLead: any;
    institutions: ResultsByInstitution[];
    coreData: any;
    innovatonUse: any;
    geo_scope_id: number;
    regions: ResultRegion[];
    countries: ResultCountry[];
    eoiOutcomes: ResultIpEoiOutcome[];
  }) {
    const initiativeName =
      params.resInitLead?.obj_initiative?.short_name ||
      '<Initiative short name not provided>';

    const institutionsString =
      params.institutions && params.institutions.length > 0
        ? this.arrayToStringAnd(
            params.institutions.map((el) => el['institutions_name']),
          )
        : ' <Institutions not provided>';

    const coreResultTitle =
      params.coreData?.obj_result?.title || '<Core result title not provided>';

    const innovationUseStr = this.innovationUseString(
      params.innovatonUse.actors,
      params.innovatonUse.organization,
      params.innovatonUse.measures,
    );

    const geoScopeString = this._buildGeoScopeString(
      params.geo_scope_id,
      params.regions,
      params.countries,
    );

    const eoiOutcomesString =
      params.eoiOutcomes && params.eoiOutcomes.length > 0
        ? this.arrayToStringAnd(params.eoiOutcomes.map((el) => el['title']))
        : '<EOI outcomes not provided>';

    return {
      title: `2030 Scaling Ambition Statement`,
      body: `By 2030, the ${initiativeName} will work together with${institutionsString} to accomplish the use of ${coreResultTitle} by${innovationUseStr}, ${geoScopeString} to contribute achieving ${eoiOutcomesString}.`,
    };
  }

  private async _loadFinalData(resultId: number, result_ip: any) {
    return Promise.all([
      this._evidenceRepository.findOne({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 5,
        },
      }),
      this._resultIpExpertWorkshopRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      }),
      this._innovationByResultRepository.findOne({
        where: {
          ipsr_role_id: 1,
          result_innovation_package_id: result_ip.result_innovation_package_id,
          is_active: true,
        },
        relations: [
          'obj_result',
          'obj_readiness_level_evidence_based',
          'obj_use_level_evidence_based',
        ],
      }),
    ]);
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
}
