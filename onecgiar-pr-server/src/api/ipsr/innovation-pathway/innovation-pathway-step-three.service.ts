import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import {
  HandlersError,
  ReturnResponse,
  ReturnResponseDto,
} from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { SaveStepTwoThree } from './dto/save-step-three.dto';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { ResultsIpActor } from '../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsByIpInnovationUseMeasure } from '../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { IpsrRepository } from '../ipsr.repository';
import { IsNull } from 'typeorm';
import { ResultsIpInstitutionType } from '../results-ip-institution-type/entities/results-ip-institution-type.entity';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { Ipsr } from '../entities/ipsr.entity';
import { ResultIpExpertWorkshopOrganizedRepostory } from './repository/result-ip-expert-workshop-organized.repository';
import { ResultIpExpertWorkshopOrganized } from './entities/result-ip-expert-workshop-organized.entity';
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';

@Injectable()
export class InnovationPathwayStepThreeService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    protected readonly _resultIpSdgsTargetsRepository: ResultIpSdgTargetRepository,
    protected readonly _resultComplementaryInnovation: ResultsComplementaryInnovationRepository,
    protected readonly _resultsByIpInnovationUseMeasureRepository: ResultsByIpInnovationUseMeasureRepository,
    protected readonly _resultsIpActorRepository: ResultsIpActorRepository,
    protected readonly _resultsIpInstitutionTypeRepository: ResultsIpInstitutionTypeRepository,
    protected readonly _evidenceRepository: EvidencesRepository,
    protected readonly _resultIpExpertWorkshopRepository: ResultIpExpertWorkshopOrganizedRepostory,
    protected readonly _returnResponse: ReturnResponse,
    private readonly _versioningService: VersioningService,
  ) {}

  async saveComplementaryinnovation(
    resultId: number,
    user: TokenDto,
    saveData: SaveStepTwoThree,
  ): Promise<ReturnResponseDto<any>> {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true,
        },
      });

      if (!result) {
        throw {
          response: resultId,
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

      const {
        result_innovation_package: result_ip,
        result_ip_result_core: result_ip_core,
        result_ip_result_complementary: result_ip_complementary,
      } = saveData;

      await this._resultInnovationPackageRepository.update(
        result_ip.result_innovation_package_id,
        {
          is_expert_workshop_organized: result_ip.is_expert_workshop_organized,
          readiness_level_evidence_based:
            result_ip.readiness_level_evidence_based,
          use_level_evidence_based: result_ip.use_level_evidence_based,
          assessed_during_expert_workshop_id:
            result_ip?.is_expert_workshop_organized
              ? result_ip.assessed_during_expert_workshop_id
              : null,
          last_updated_by: user.id,
        },
      );
      await this.saveinnovationWorkshop(
        user,
        result_ip_core,
        result_ip.assessed_during_expert_workshop_id,
      );

      await this.saveInnovationUse(user, saveData);

      if (result_ip_complementary?.length) {
        for (const ripc of result_ip_complementary) {
          await this.saveinnovationWorkshop(
            user,
            ripc,
            result_ip.assessed_during_expert_workshop_id,
          );
        }
      }

      await this.saveWorkshop(result.id, user, saveData);

      const { response } = await this.getStepThree(resultId);

      return this._returnResponse.format({
        response: response,
        message:
          'The Result Complementary Innovation have been saved successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, true);
    }
  }

  async saveinnovationWorkshop(user: TokenDto, rbi: Ipsr, data_id: any) {
    try {
      await this._innovationByResultRepository.update(
        rbi.result_by_innovation_package_id,
        {
          readiness_level_evidence_based: rbi?.readiness_level_evidence_based,

          readinees_evidence_link: rbi?.readinees_evidence_link,

          use_level_evidence_based: rbi?.use_level_evidence_based,

          use_evidence_link: rbi?.use_evidence_link,
          use_details_of_evidence: rbi?.use_details_of_evidence,

          readiness_details_of_evidence: rbi?.readiness_details_of_evidence,

          potential_innovation_readiness_level: this.validData(
            rbi?.potential_innovation_readiness_level,
            data_id,
            [2],
          ),
          potential_innovation_use_level: this.validData(
            rbi?.potential_innovation_use_level,
            data_id,
            [2],
          ),
          current_innovation_readiness_level: this.validData(
            rbi?.current_innovation_readiness_level,
            data_id,
            [1, 2],
          ),
          current_innovation_use_level: this.validData(
            rbi?.current_innovation_use_level,
            data_id,
            [1, 2],
          ),
          last_updated_by: user?.id,
        },
      );
      return;
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private validData(data: any, data_id: number, valid: number[]) {
    return valid.includes(parseInt(`${data_id}`)) ? data : null;
  }

  async saveWorkshop(
    resultId: number,
    user: TokenDto,
    saveStepTwoThree: SaveStepTwoThree,
  ) {
    const id: number = +resultId;
    try {
      const workShopEvidence: Evidence = await this._evidenceRepository.findOne(
        {
          where: {
            result_id: +id,
            evidence_type_id: 5,
            is_active: 1,
          },
        },
      );

      const {
        result_innovation_package: rip,
        link_workshop_list: lwl,
        result_ip_expert_workshop_organized: ripewo,
      } = saveStepTwoThree;

      if (rip.is_expert_workshop_organized === false) {
        await this._evidenceRepository.update(workShopEvidence?.id, {
          is_active: 0,
          last_updated_by: user.id,
        });

        const expertWorkshopExist: ResultIpExpertWorkshopOrganized[] =
          await this._resultIpExpertWorkshopRepository.find({
            where: {
              result_id: resultId,
            },
          });

        if (expertWorkshopExist.length) {
          for (const ewo of expertWorkshopExist) {
            await this._resultIpExpertWorkshopRepository.update(
              ewo.result_ip_expert_workshop_organized_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }

        return {
          message: 'The link workshop list have been inactive successfully',
        };
      }

      // if (rip.is_expert_workshop_organized === true && !lwl) {
      //   return {
      //     response: { valid: false },
      //     message: 'The link workshop list is required',
      //     status: HttpStatus.BAD_REQUEST,
      //   };
      // }

      if (lwl) {
        if (workShopEvidence) {
          await this._evidenceRepository.update(workShopEvidence.id, {
            link: lwl,
            last_updated_by: user.id,
          });
        } else {
          await this._evidenceRepository.save({
            result_id: resultId,
            link: lwl,
            evidence_type_id: 5,
            created_by: user.id,
            last_updated_by: user.id,
          });
        }
      }

      if (ripewo?.length) {
        for (const entity of ripewo) {
          if (!entity.first_name || !entity.last_name) {
            return {
              response: { valid: false },
              message: 'The expert workshop organized is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }

          const expertWorkshopExist: ResultIpExpertWorkshopOrganized =
            await this._resultIpExpertWorkshopRepository.findOne({
              where: {
                result_id: resultId,
                is_active: true,
                first_name: entity.first_name,
                last_name: entity.last_name,
              },
            });

          if (!expertWorkshopExist) {
            await this._resultIpExpertWorkshopRepository.save({
              result_id: resultId,
              first_name: entity.first_name,
              last_name: entity.last_name,
              email: entity.email,
              workshop_role: entity.workshop_role,
              created_by: user.id,
              last_updated_by: user.id,
            });
          } else {
            await this._resultIpExpertWorkshopRepository.update(
              expertWorkshopExist.result_ip_expert_workshop_organized_id,
              {
                first_name: entity.first_name,
                last_name: entity.last_name,
                email: entity.email,
                workshop_role: entity.workshop_role,
                last_updated_by: user.id,
              },
            );
          }
        }

        const expertWorkshopExist: ResultIpExpertWorkshopOrganized[] =
          await this._resultIpExpertWorkshopRepository.find({
            where: {
              result_id: resultId,
              is_active: true,
            },
          });

        for (const ewe of expertWorkshopExist) {
          const isExist = ripewo.find(
            (x) =>
              x.first_name === ewe.first_name && x.last_name === ewe.last_name,
          );
          if (!isExist) {
            await this._resultIpExpertWorkshopRepository.update(
              ewe.result_ip_expert_workshop_organized_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }
      } else {
        const isExist = await this._resultIpExpertWorkshopRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });
        if (isExist.length) {
          for (const ewe of isExist) {
            await this._resultIpExpertWorkshopRepository.update(
              ewe.result_ip_expert_workshop_organized_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }
      }

      return {
        valid: true,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getStepThree(resultId: number) {
    try {
      const result_ip = await this._resultInnovationPackageRepository.findOne({
        where: { result_innovation_package_id: resultId, is_active: true },
        relations: { obj_result_innovation_package: true },
      });
      if (!result_ip) {
        throw {
          response: resultId,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
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
      const core_innovation = await this._resultRepository.findOne({
        where: { id: result_core.result_id, is_active: true },
      });
      const result_complementary =
        await this._innovationByResultRepository.find({
          where: {
            ipsr_role_id: 2,
            result_innovation_package_id:
              result_ip.result_innovation_package_id,
            is_active: true,
          },
          relations: [
            'obj_result',
            'obj_readiness_level_evidence_based',
            'obj_use_level_evidence_based',
          ],
        });

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

      const returdata: SaveStepTwoThree = {
        link_workshop_list: link_workshop_list?.link,
        result_ip_expert_workshop_organized,
        innovatonUse: {
          actors: (
            await this._resultsIpActorRepository.find({
              where: {
                is_active: true,
                result_ip_result_id:
                  result_core.result_by_innovation_package_id,
              },
            })
          ).map((el) => ({
            ...el,
            men_non_youth: el.men - el.men_youth,
            women_non_youth: el.women - el.women_youth,
          })),
          measures: await this._resultsByIpInnovationUseMeasureRepository.find({
            where: {
              is_active: true,
              result_ip_result_id: result_core.result_by_innovation_package_id,
            },
          }),
          organization: (
            await this._resultsIpInstitutionTypeRepository.find({
              where: {
                result_ip_results_id:
                  result_core.result_by_innovation_package_id,
                institution_roles_id: 6,
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
        },
        result_innovation_package: result_ip,
        result_ip_result_complementary: result_complementary,
        result_ip_result_core: result_core,
        result_core_innovation: {
          core_result_code: core_innovation.result_code,
          core_title: core_innovation.title,
          core_result_current_phase: core_innovation.version_id,
        },
      };

      console.log(
        '🚀 ~ InnovationPathwayStepThreeService ~ getStepThree ~ returdata:',
        returdata,
      );
      return {
        response: returdata,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async saveInnovationUse(
    user: TokenDto,
    { innovatonUse: crtr, result_ip_result_core: riprc }: SaveStepTwoThree,
  ) {
    const useLevel = await this._innovationByResultRepository.findOne({
      where: {
        result_by_innovation_package_id: riprc.result_by_innovation_package_id,
      },
      relations: ['obj_use_level_evidence_based'],
    });

    if (crtr?.actors?.length) {
      const { actors } = crtr;
      actors.map(async (el: ResultsIpActor) => {
        let actorExists: ResultsIpActor = null;

        if (el?.sex_and_age_disaggregation === true && !el?.how_many) {
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
            result_ip_result_id: riprc.result_by_innovation_package_id,
            result_ip_actors_id: el.result_ip_actors_id,
          };

          if (!el?.result_ip_actors_id) {
            switch (`${actor_type_id}`) {
              case '5':
                whereOptions.other_actor_type =
                  el?.other_actor_type || IsNull();
                break;
            }
            delete whereOptions.result_ip_actors_id;
          } else {
            delete whereOptions.actor_type_id;
          }
          actorExists = await this._resultsIpActorRepository.findOne({
            where: whereOptions,
          });
        } else if (!actorExists && el?.result_ip_actors_id) {
          actorExists = await this._resultsIpActorRepository.findOne({
            where: {
              result_ip_actors_id: el?.result_ip_actors_id,
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        } else if (!actorExists) {
          actorExists = await this._resultsIpActorRepository.findOne({
            where: {
              actor_type_id: IsNull(),
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
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
          await this._resultsIpActorRepository.update(
            actorExists.result_ip_actors_id,
            {
              actor_type_id: el?.actor_type_id,
              is_active: el.is_active == undefined ? true : el.is_active,
              men: el?.men,
              men_youth: el?.men_youth,
              women: el?.women,
              women_youth: el?.women_youth,
              evidence_link: el?.evidence_link,
              other_actor_type: el?.other_actor_type,
              last_updated_by: user.id,
              sex_and_age_disaggregation:
                el?.sex_and_age_disaggregation === true ? true : false,
              how_many: el?.how_many,
            },
          );
          if (useLevel?.obj_use_level_evidence_based.level === 0) {
            await this._resultsIpActorRepository.update(
              actorExists.result_ip_actors_id,
              {
                actor_type_id: null,
                is_active: false,
                men: null,
                men_youth: null,
                women: null,
                women_youth: null,
                evidence_link: null,
                other_actor_type: null,
                last_updated_by: user.id,
                sex_and_age_disaggregation: null,
                how_many: null,
              },
            );
          }
        } else {
          if (!el?.actor_type_id) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpActorRepository.save({
            actor_type_id: el.actor_type_id,
            is_active: el.is_active,
            men: el.men,
            men_youth: el.men_youth,
            women: el.women,
            women_youth: el.women_youth,
            last_updated_by: user.id,
            created_by: user.id,
            evidence_link: el.evidence_link,
            result_ip_result_id: riprc.result_by_innovation_package_id,
            other_actor_type: el.other_actor_type,
            sex_and_age_disaggregation:
              el?.sex_and_age_disaggregation === true ? true : false,
            how_many: el?.how_many,
          });
        }
      });
    }

    if (crtr?.organization.length) {
      const { organization } = crtr;
      organization.map(async (el) => {
        let ite: ResultsIpInstitutionType = null;
        if (el?.institution_types_id && el?.institution_types_id != 78) {
          ite = await this._resultsIpInstitutionTypeRepository.findOne({
            where: {
              institution_types_id: el.institution_types_id,
              result_ip_results_id: riprc.result_by_innovation_package_id,
              institution_roles_id: 6,
            },
          });
        }

        if (!ite && el?.id) {
          ite = await this._resultsIpInstitutionTypeRepository.findOne({
            where: {
              id: el.id,
              result_ip_results_id: riprc.result_by_innovation_package_id,
              institution_roles_id: 6,
            },
          });
        }

        if (ite) {
          if (!el?.institution_types_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpInstitutionTypeRepository.update(ite.id, {
            last_updated_by: user.id,
            institution_types_id: el.institution_types_id,
            how_many: el?.how_many,
            other_institution: el?.other_institution,
            graduate_students: el?.graduate_students,
            is_active: el.is_active == undefined ? true : el.is_active,
            evidence_link: el?.evidence_link,
          });
          if (
            useLevel?.obj_use_level_evidence_based &&
            useLevel.obj_use_level_evidence_based.level === 0
          ) {
            await this._resultsIpInstitutionTypeRepository.update(ite.id, {
              last_updated_by: user.id,
              institution_types_id: null,
              how_many: null,
              other_institution: null,
              graduate_students: null,
              is_active: false,
              evidence_link: null,
            });
          }
        } else {
          if (!el?.institution_types_id) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsIpInstitutionTypeRepository.save({
            result_ip_results_id: riprc.result_by_innovation_package_id,
            created_by: user.id,
            last_updated_by: user.id,
            institution_types_id: el?.institution_types_id,
            other_institution: el?.other_institution,
            graduate_students: el?.graduate_students,
            institution_roles_id: 6,
            how_many: el?.how_many,
            evidence_link: el?.evidence_link,
          });
        }
      });
    }

    if (crtr?.measures.length) {
      const { measures } = crtr;
      measures.map(async (el) => {
        let ripm: ResultsByIpInnovationUseMeasure = null;

        if (el?.unit_of_measure) {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              unit_of_measure: el.unit_of_measure,
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        } else {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_ip_result_id: riprc.result_by_innovation_package_id,
            },
          });
        }

        if (!ripm && el?.result_ip_result_measures_id) {
          ripm = await this._resultsByIpInnovationUseMeasureRepository.findOne({
            where: {
              result_ip_result_measures_id: el.result_ip_result_measures_id,
            },
          });
        }

        if (ripm) {
          await this._resultsByIpInnovationUseMeasureRepository.update(
            ripm.result_ip_result_measures_id,
            {
              unit_of_measure: el.unit_of_measure,
              quantity: el.quantity,
              last_updated_by: user.id,
              evidence_link: el.evidence_link,
              is_active: el.is_active == undefined ? true : el.is_active,
            },
          );
          if (useLevel?.obj_use_level_evidence_based.level === 0) {
            await this._resultsByIpInnovationUseMeasureRepository.update(
              ripm.result_ip_result_measures_id,
              {
                unit_of_measure: null,
                quantity: null,
                last_updated_by: user.id,
                evidence_link: null,
                is_active: false,
              },
            );
          }
        } else {
          if (!el?.unit_of_measure) {
            return {
              response: { status: 'Error' },
              message: 'The field unit of measure is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultsByIpInnovationUseMeasureRepository.save({
            result_ip_result_id: riprc.result_by_innovation_package_id,
            unit_of_measure: el.unit_of_measure,
            quantity: el.quantity,
            created_by: user.id,
            last_updated_by: user.id,
            evidence_link: el.evidence_link,
          });
        }
      });
    }
  }

  isNullData(data: any) {
    return data == undefined ? null : data;
  }
}
