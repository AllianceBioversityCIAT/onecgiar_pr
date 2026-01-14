import { Injectable, HttpStatus } from '@nestjs/common';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { VersionsService } from '../versions/versions.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { CapdevDto } from './dto/create-capacity-developents.dto';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultsCapacityDevelopments } from './entities/results-capacity-developments.entity';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitution } from '../results_by_institutions/entities/results_by_institution.entity';
import { CreateInnovationDevDto } from './dto/create-innovation-dev.dto';
import { ResultsInnovationsDevRepository } from './repositories/results-innovations-dev.repository';
import { ResultsInnovationsDev } from './entities/results-innovations-dev.entity';
import { ResultRepository } from '../result.repository';
import { PolicyChangesDto } from './dto/create-policy-changes.dto';
import { ResultsPolicyChanges } from './entities/results-policy-changes.entity';
import { ResultsPolicyChangesRepository } from './repositories/results-policy-changes.repository';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { In } from 'typeorm';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from './innovation_dev.service';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';
import { ResultAnswer } from '../result-questions/entities/result-answers.entity';
import { Result } from '../entities/result.entity';

@Injectable()
export class SummaryService {
  constructor(
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _innoDevService: InnoDevService,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
  ) {}

  /**
   *
   * @param innovation
   * @param resultId
   * @param user
   * @returns
   */
  async saveInnovationUse(
    innovationUseDto: InnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const resultExist = await this._resultRepository.findOne({
        where: { id: resultId },
      });

      const InnovationUse = await this._innoDevService.saveAnticipatedInnoUser(
        resultExist.id,
        user.id,
        innovationUseDto,
      );

      return {
        response: InnovationUse,
        message: 'Results Innovations Use has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   *
   * @param resultId
   * @returns
   */
  async getInnovationUse(resultId: number) {
    try {
      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      actorsData.map((el) => {
        el['men_non_youth'] = el.men - el.men_youth;
        el['women_non_youth'] = el.women - el.women_youth;
      });
      const innovatonUse = {
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({
          where: { result_id: resultId, is_active: true },
        }),
        organization: (
          await this._resultByIntitutionsTypeRepository.find({
            where: {
              results_id: resultId,
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

      return {
        response: innovatonUse,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   *
   * @param capdev
   * @param resultId
   * @param user
   */
  async saveCapacityDevelopents(
    capdev: CapdevDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const {
        female_using,
        male_using,
        has_unkown_using,
        non_binary_using,
        capdev_delivery_method_id,
        capdev_term_id,
        institutions,
        is_attending_for_organization,
      } = capdev;
      const capDevExists =
        await this._resultsCapacityDevelopmentsRepository.capDevExists(
          resultId,
        );
      let CapDevData: ResultsCapacityDevelopments = undefined;
      if (capDevExists) {
        capDevExists.female_using = female_using || 0;
        capDevExists.male_using = male_using || 0;
        capDevExists.has_unkown_using = has_unkown_using || 0;
        capDevExists.non_binary_using = non_binary_using || 0;
        capDevExists.last_updated_by = user.id;
        capDevExists.capdev_delivery_method_id = capdev_delivery_method_id;
        capDevExists.capdev_term_id = capdev_term_id;
        capDevExists.is_attending_for_organization =
          is_attending_for_organization;
        CapDevData =
          await this._resultsCapacityDevelopmentsRepository.save(capDevExists);
      } else {
        const newCapDev = new ResultsCapacityDevelopments();
        newCapDev.created_by = user.id;
        newCapDev.last_updated_by = user.id;
        newCapDev.female_using = female_using || 0;
        newCapDev.male_using = male_using || 0;
        newCapDev.has_unkown_using = has_unkown_using || 0;
        newCapDev.result_object = { id: resultId } as Result;
        newCapDev.non_binary_using = non_binary_using || 0;
        newCapDev.result_id = resultId;
        newCapDev.capdev_delivery_method_id = capdev_delivery_method_id;
        newCapDev.capdev_term_id = capdev_term_id;
        newCapDev.is_attending_for_organization = is_attending_for_organization;
        CapDevData =
          await this._resultsCapacityDevelopmentsRepository.save(newCapDev);
      }

      if (institutions?.length) {
        const institutionsList: ResultsByInstitution[] = [];
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          institutions,
          3,
          user.id,
        );
        for (let index = 0; index < institutions.length; index++) {
          const { institutions_id } = institutions[index];
          const instiExists =
            await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
              resultId,
              institutions_id,
              3,
            );
          if (!instiExists) {
            const newInstitution = new ResultsByInstitution();
            newInstitution.institution_roles_id = 3;
            newInstitution.created_by = user.id;
            newInstitution.last_updated_by = user.id;
            newInstitution.institutions_id = institutions_id;
            newInstitution.result_id = resultId;
            institutionsList.push(newInstitution);
          }
        }
        await this._resultByIntitutionsRepository.save(institutionsList);
      } else {
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          [],
          3,
          user.id,
        );
      }

      return {
        response: CapDevData,
        message: 'Capacity Developents has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   *
   * @param resultId
   * @returns
   */
  async getCapacityDevelopents(resultId: number) {
    try {
      const capDevExists =
        await this._resultsCapacityDevelopmentsRepository.capDevExists(
          resultId,
        );
      const capDepInstitutions =
        await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
          resultId,
          3,
        );

      if (!capDevExists) {
        return {
          response: {
            result_capacity_development_id: null,
            result_id: resultId,
            male_using: null,
            female_using: null,
            non_binary_using: null,
            has_unkown_using: null,
            capdev_delivery_method_id: null,
            capdev_term_id: null,
            is_attending_for_organization: null,
            institutions: capDepInstitutions,
          },
          message: 'No capacity development data found for this result',
          status: HttpStatus.OK,
        };
      }

      return {
        response: {
          ...capDevExists,
          institutions: capDepInstitutions,
        },
        message: 'Capacity Developents has been created successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   *
   * @param createInnovationDevDto
   * @param resultId
   * @param user
   * @returns
   */
  async saveInnovationDev(
    createInnovationDevDto: CreateInnovationDevDto,
    innovationUseDto: InnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );
      const {
        evidences_justification,
        innovation_characterization_id,
        innovation_collaborators,
        innovation_developers,
        innovation_nature_id,
        innovation_readiness_level_id,
        is_new_variety,
        number_of_varieties,
        readiness_level,
        result_innovation_dev_id,
        short_title,
        innovation_acknowledgement,
        innovation_pdf,
        innovation_user_to_be_determined,
      } = createInnovationDevDto;

      let InnDevRes: ResultsInnovationsDev = undefined;
      if (innDevExists) {
        innDevExists.short_title = short_title;
        innDevExists.last_updated_by = user.id;
        innDevExists.is_new_variety = is_new_variety;
        innDevExists.readiness_level = readiness_level;
        innDevExists.number_of_varieties = number_of_varieties;
        innDevExists.innovation_nature_id = innovation_nature_id;
        innDevExists.innovation_developers = innovation_developers;
        innDevExists.evidences_justification = evidences_justification;
        innDevExists.innovation_collaborators = innovation_collaborators;
        innDevExists.result_innovation_dev_id = result_innovation_dev_id;
        innDevExists.innovation_readiness_level_id =
          innovation_readiness_level_id;
        innDevExists.innovation_characterization_id =
          innovation_characterization_id;
        innDevExists.innovation_acknowledgement = innovation_acknowledgement;
        innDevExists.innovation_pdf = innovation_pdf;
        innDevExists.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        InnDevRes = await this._resultsInnovationsDevRepository.save(
          innDevExists as any,
        );
      } else {
        const newInnDev = new ResultsInnovationsDev();
        newInnDev.created_by = user.id;
        newInnDev.results_id = resultId;
        newInnDev.last_updated_by = user.id;
        newInnDev.short_title = short_title;
        newInnDev.is_active = true;
        newInnDev.is_new_variety = is_new_variety;
        newInnDev.readiness_level = readiness_level;
        newInnDev.number_of_varieties = number_of_varieties;
        newInnDev.innovation_nature_id = innovation_nature_id;
        newInnDev.innovation_developers = innovation_developers;
        newInnDev.evidences_justification = evidences_justification;
        newInnDev.innovation_collaborators = innovation_collaborators;
        newInnDev.result_innovation_dev_id = result_innovation_dev_id;
        newInnDev.innovation_readiness_level_id = innovation_readiness_level_id;
        newInnDev.innovation_characterization_id =
          innovation_characterization_id;
        newInnDev.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        InnDevRes = await this._resultsInnovationsDevRepository.save(newInnDev);
      }

      // * Save Questions
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling.q1.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling.q2.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q1.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q2.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights.q3.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.innovation_team_diversity.options,
      );
      await this._innoDevService.saveOptionsAndSubOptions(
        resultId,
        user.id,
        createInnovationDevDto?.megatrends.options,
      );

      // * Save Evidence
      await this._innoDevService.saveEvidence(
        resultId,
        user.id,
        createInnovationDevDto.reference_materials,
        4,
      );

      // * Save Investment
      await this._innoDevService.saveInitiativeInvestment(
        resultId,
        user.id,
        createInnovationDevDto,
      );
      await this._innoDevService.saveBillateralInvestment(
        resultId,
        user.id,
        createInnovationDevDto,
      );
      await this._innoDevService.savePartnerInvestment(
        user.id,
        createInnovationDevDto,
      );

      if (
        innovation_user_to_be_determined != false ||
        innovation_user_to_be_determined != null
      ) {
        // * Save InnovationUser
        await this._innoDevService.saveAnticipatedInnoUser(
          resultId,
          user.id,
          innovationUseDto,
        );
      }

      return {
        response: InnDevRes,
        message: 'Results Innovations Dev has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   *
   * @param resultId
   * @returns
   */
  async getInnovationDev(resultId: number) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );

      const pictures = await this._evidenceRepository.find({
        where: { result_id: resultId, evidence_type_id: 3, is_active: 1 },
      });
      const reference_materials = await this._evidenceRepository.find({
        where: { result_id: resultId, evidence_type_id: 4, is_active: 1 },
      });
      const result = await this._resultRepository.getResultById(resultId);

      const actorsData = await this._resultActorRepository.find({
        where: { result_id: resultId, is_active: true },
        relations: { obj_actor_type: true },
      });
      const innovatonUse = {
        actors: actorsData,
        measures: await this._resultIpMeasureRepository.find({
          where: { result_id: resultId, is_active: true },
        }),
        organization: (
          await this._resultByIntitutionsTypeRepository.find({
            where: {
              results_id: resultId,
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

      const initiatives = await this._resultByInitiativeRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      const initiative_expected_investment =
        await this._resultInitiativesBudgetRepository.find({
          where: {
            result_initiative_id: In(initiatives.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_initiative: {
              obj_initiative: true,
            },
          },
        });

      const npp = await this._nonPooledProjectRepository.find({
        where: {
          results_id: resultId,
          is_active: true,
          non_pooled_project_type_id: 1,
        },
      });

      const bilateral_expected_investment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            non_pooled_projetct_id: In(npp.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_non_pooled_projetct: {
              obj_funder_institution_id: true,
            },
          },
        });

      const institutions: ResultsByInstitution[] =
        await this._resultByIntitutionsRepository.find({
          where: { result_id: resultId, is_active: true },
        });
      const institutions_expected_investment =
        await this._resultInstitutionsBudgetRepository.find({
          where: {
            result_institution_id: In(institutions.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_institution: {
              obj_institutions: {
                obj_institution_type_code: true,
              },
            },
          },
        });

      return {
        response: {
          ...innDevExists,
          pictures,
          innovatonUse,
          initiative_expected_investment,
          bilateral_expected_investment,
          institutions_expected_investment,
          reference_materials,
          result,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   *
   * @param policyChangesDto
   * @param resultId
   * @param user
   * @returns
   */
  async savePolicyChanges(
    policyChangesDto: PolicyChangesDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const resultsPolicyChanges =
        await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(
          resultId,
        );
      const {
        amount,
        institutions,
        policy_stage_id,
        policy_type_id,
        status_amount,
        optionsWithAnswers,
        result_related_engagement,
      } = policyChangesDto;

      let policyChangesData: ResultsPolicyChanges = undefined;
      if (resultsPolicyChanges) {
        resultsPolicyChanges.amount = amount || null;
        resultsPolicyChanges.last_updated_by = user.id;
        resultsPolicyChanges.policy_stage_id = policy_stage_id;
        resultsPolicyChanges.policy_type_id = policy_type_id;
        resultsPolicyChanges.result_related_engagement =
          result_related_engagement;
        resultsPolicyChanges.status_amount = status_amount;
        policyChangesData =
          await this._resultsPolicyChangesRepository.save(resultsPolicyChanges);
      } else {
        const newResultsPolicyChanges = new ResultsPolicyChanges();
        newResultsPolicyChanges.amount = amount || null;
        newResultsPolicyChanges.policy_stage_id = policy_stage_id;
        newResultsPolicyChanges.policy_type_id = policy_type_id;
        newResultsPolicyChanges.result_related_engagement =
          result_related_engagement;
        newResultsPolicyChanges.result_id = resultId;
        newResultsPolicyChanges.created_by = user.id;
        newResultsPolicyChanges.last_updated_by = user.id;
        newResultsPolicyChanges.status_amount = status_amount;
        policyChangesData = await this._resultsPolicyChangesRepository.save(
          newResultsPolicyChanges,
        );
      }

      if (institutions?.length) {
        const institutionsList: ResultsByInstitution[] = [];
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          institutions,
          4,
          user.id,
        );
        for (let index = 0; index < institutions.length; index++) {
          const { institutions_id } = institutions[index];
          const instiExists =
            await this._resultByIntitutionsRepository.getGenericResultByInstitutionExists(
              resultId,
              institutions_id,
              4,
            );
          if (!instiExists) {
            const newInstitution = new ResultsByInstitution();
            newInstitution.institution_roles_id = 4;
            newInstitution.created_by = user.id;
            newInstitution.last_updated_by = user.id;
            newInstitution.institutions_id = institutions_id;
            newInstitution.result_id = resultId;
            institutionsList.push(newInstitution);
          }
        }
        await this._resultByIntitutionsRepository.save(institutionsList);
      } else {
        await this._resultByIntitutionsRepository.updateGenericIstitutions(
          resultId,
          [],
          4,
          user.id,
        );
      }

      for (const answer of optionsWithAnswers) {
        const optionExist = await this._resultAnswerRepository.findOne({
          where: {
            result_id: resultId,
            result_question_id: answer.result_question_id,
          },
        });

        if (optionExist) {
          optionExist.answer_boolean = answer.answer_boolean || false;
          optionExist.answer_text = answer.answer_text;
          optionExist.last_updated_by = user.id;
          await this._resultAnswerRepository.save(optionExist);
        } else {
          const optionAnswer = new ResultAnswer();
          optionAnswer.result_question_id = answer.result_question_id;
          optionAnswer.answer_boolean = answer.answer_boolean || false;
          optionAnswer.answer_text = answer.answer_text;
          optionAnswer.result_id = resultId;
          optionAnswer.created_by = user.id;
          optionAnswer.last_updated_by = user.id;

          await this._resultAnswerRepository.save(optionAnswer);
        }
      }

      return {
        response: policyChangesData,
        message: 'Results Policy Changes has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   *
   * @param resultId
   * @returns
   */
  async getPolicyChanges(resultId: number) {
    try {
      const policyChangesExists =
        await this._resultsPolicyChangesRepository.ResultsPolicyChangesExists(
          resultId,
        );
      if (!policyChangesExists) {
        throw {
          response: {},
          message: 'Results Innovations Dev not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const policyChangesInstitutions =
        await this._resultByIntitutionsRepository.getGenericAllResultByInstitutionByRole(
          resultId,
          4,
        );
      return {
        response: {
          ...policyChangesExists,
          institutions: policyChangesInstitutions,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
