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
import { ResultInnovationPackage } from '../../ipsr/result-innovation-package/entities/result-innovation-package.entity';
import { ResultByInstitutionsByDeliveriesType } from '../../results/result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { In } from 'typeorm';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultCountrySubnational } from '../../results/result-countries-sub-national/entities/result-country-subnational.entity';
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
        await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(
          institutions?.map((el) => el.id),
        );
      institutions?.forEach((int) => {
        int['deliveries'] = deliveries
          ?.filter((del) => del.result_by_institution_id == int.id)
          .map((del) => del.partner_delivery_type_id);
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

      countries.forEach((el) => {
        el['sub_national'] = sub_national_counties
          .filter((seb) => seb.result_country_id == el.result_country_id)
          .map((el) => el.clarisa_subnational_scope_object);
      });

      const actorsData = await this._resultActorRepository.find({
        where: { result_id: result.id, is_active: true },
        relations: { obj_actor_type: true },
      });
      actorsData.forEach((el) => {
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
        title: `2030 Scaling Ambition Statement`,
        body: `By 2030, the ${
          resInitLead?.obj_initiative?.short_name
        } will work together with${this.arrayToStringAnd(
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

      const link_workshop_list = await this._evidenceRepository.findOne({
        where: {
          result_id: resultId,
          is_active: 1,
          evidence_type_id: 5,
        },
      });

      const result_ip_expert_workshop_organized =
        await this._resultIpExpertWorkshopRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });

      const result_core = await this._innovationByResultRepository.findOne({
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
      });

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
          countries,
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
