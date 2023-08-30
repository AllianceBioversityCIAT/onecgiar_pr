import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { ResultsInnovationsUseRepository } from './repositories/results-innovations-use.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsInnovationsUse } from './entities/results-innovations-use.entity';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../../versioning/entities/version.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInnovationsUseMeasuresRepository } from './repositories/results-innovations-use-measures.repository';
import { ResultsInnovationsUseMeasures } from './entities/results-innovations-use-measures.entity';
import { capdevDto } from './dto/create-capacity-developents.dto';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultsCapacityDevelopments } from './entities/results-capacity-developments.entity';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitution } from '../results_by_institutions/entities/results_by_institution.entity';
import {
  CreateInnovationDevDto,
  Option,
  SubOption,
} from './dto/create-innovation-dev.dto';
import { ResultsInnovationsDevRepository } from './repositories/results-innovations-dev.repository';
import { ResultsInnovationsDev } from './entities/results-innovations-dev.entity';
import { ResultRepository } from '../result.repository';
import { PolicyChangesDto } from './dto/create-policy-changes.dto';
import { ResultsPolicyChanges } from './entities/results-policy-changes.entity';
import { ResultsPolicyChangesRepository } from './repositories/results-policy-changes.repository';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';
import { ResultAnswer } from '../result-questions/entities/result-answers.entity';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { Evidence } from '../evidences/entities/evidence.entity';
import { Result } from '../entities/result.entity';
import { ResultActor } from '../result-actors/entities/result-actor.entity';
import { IsNull } from 'typeorm';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultsByInstitutionType } from '../results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';

@Injectable()
export class SummaryService {
  constructor(
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    private readonly _esultsInnovationsUseMeasuresRepository: ResultsInnovationsUseMeasuresRepository,
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _handlersError: HandlersError,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
  ) {}

  create(createSummaryDto: CreateSummaryDto) {
    return 'This action adds a new summary';
  }

  findAll() {
    return `This action returns all summary`;
  }

  findOne(id: number) {
    return `This action returns a #${id} summary`;
  }

  update(id: number, updateSummaryDto: UpdateSummaryDto) {
    return `This action updates a #${id} summary`;
  }

  remove(id: number) {
    return `This action removes a #${id} summary`;
  }

  /**
   *
   * @param innovation
   * @param resultId
   * @param user
   * @returns
   */
  async saveInnovationUse(
    innovation: InnovationUseDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const { result_innovation_use_id, female_using, male_using, other } =
        innovation;
      const innExists =
        await this._resultsInnovationsUseRepository.InnovatonUseExists(
          resultId,
        );
      let InnovationUse: ResultsInnovationsUse = undefined;
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      if (innExists) {
        innExists.female_using = female_using || null;
        innExists.male_using = male_using || null;
        innExists.last_updated_by = user.id;
        InnovationUse = await this._resultsInnovationsUseRepository.save(
          innExists,
        );
      } else {
        const newInne = new ResultsInnovationsUse();
        newInne.created_by = user.id;
        newInne.last_updated_by = user.id;
        newInne.female_using = female_using;
        newInne.male_using = male_using;
        newInne.results_id = resultId;
        InnovationUse = await this._resultsInnovationsUseRepository.save(
          newInne,
        );
      }

      if (other?.length) {
        const measureList = other
          .filter((el) => !!el.result_innovations_use_measure_id)
          .map((d) => d.result_innovations_use_measure_id);
        await this._esultsInnovationsUseMeasuresRepository.updateInnovatonUseMeasures(
          InnovationUse.result_innovation_use_id,
          measureList,
          user.id,
        );
        let tesultsInnovationsUseMeasuresList: ResultsInnovationsUseMeasures[] =
          [];
        for (let index = 0; index < other.length; index++) {
          const {
            quantity,
            unit_of_measure,
            result_innovations_use_measure_id,
          } = other[index];
          const innMesExists =
            await this._esultsInnovationsUseMeasuresRepository.innovatonUseMeasuresExists(
              result_innovations_use_measure_id,
            );
          if (innMesExists) {
            innMesExists.last_updated_by = user.id;
            innMesExists.quantity = quantity;
            innMesExists.unit_of_measure = unit_of_measure;
            tesultsInnovationsUseMeasuresList.push(innMesExists);
          } else {
            const newInnMes = new ResultsInnovationsUseMeasures();
            newInnMes.created_by = user.id;
            newInnMes.last_updated_by = user.id;
            newInnMes.quantity = quantity;
            newInnMes.unit_of_measure = unit_of_measure;
            newInnMes.result_innovation_use_id =
              InnovationUse.result_innovation_use_id;
            tesultsInnovationsUseMeasuresList.push(newInnMes);
          }
        }
        await this._esultsInnovationsUseMeasuresRepository.save(
          tesultsInnovationsUseMeasuresList,
        );
      } else {
        await this._esultsInnovationsUseMeasuresRepository.updateInnovatonUseMeasures(
          InnovationUse.result_innovation_use_id,
          [],
          user.id,
        );
      }

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
      const innExists =
        await this._resultsInnovationsUseRepository.InnovatonUseExists(
          resultId,
        );
      if (!innExists) {
        throw {
          response: {},
          message: 'Results Innovations Use not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const allInnUseMes =
        await this._esultsInnovationsUseMeasuresRepository.getAllResultInnovationsUseMeasureByInnoUseId(
          innExists.result_innovation_use_id,
        );
      return {
        response: {
          ...innExists,
          other: allInnUseMes,
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
   * @param capdev
   * @param resultId
   * @param user
   */
  async saveCapacityDevelopents(
    capdev: capdevDto,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const {
        result_capacity_development_id,
        female_using,
        male_using,
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
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      if (capDevExists) {
        capDevExists.female_using = female_using || null;
        capDevExists.male_using = male_using || null;
        capDevExists.last_updated_by = user.id;
        capDevExists.capdev_delivery_method_id = capdev_delivery_method_id;
        capDevExists.capdev_term_id = capdev_term_id;
        capDevExists.is_attending_for_organization =
          is_attending_for_organization;
        CapDevData = await this._resultsCapacityDevelopmentsRepository.save(
          capDevExists,
        );
      } else {
        const newCapDev = new ResultsCapacityDevelopments();
        newCapDev.created_by = user.id;
        newCapDev.last_updated_by = user.id;
        newCapDev.female_using = female_using || null;
        newCapDev.male_using = male_using || null;
        newCapDev.result_id = resultId;
        newCapDev.capdev_delivery_method_id = capdev_delivery_method_id;
        newCapDev.capdev_term_id = capdev_term_id;
        CapDevData = await this._resultsCapacityDevelopmentsRepository.save(
          newCapDev,
        );
      }

      if (institutions?.length) {
        let institutionsList: ResultsByInstitution[] = [];
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
        throw {
          response: {},
          message: 'Capacity Developents not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: {
          ...capDevExists,
          institutions: capDepInstitutions,
        },
        message: 'Capacity Developents has been created successfully',
        status: HttpStatus.CREATED,
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
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
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
        InnDevRes = await this._resultsInnovationsDevRepository.save(
          innDevExists,
        );
      } else {
        const newInnDev = new ResultsInnovationsDev();
        newInnDev.created_by = user.id;
        newInnDev.results_id = resultId;
        newInnDev.last_updated_by = user.id;
        newInnDev.short_title = short_title;
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
        newInnDev.innovation_acknowledgement = innovation_acknowledgement;
        newInnDev.innovation_pdf = innovation_pdf;
        InnDevRes = await this._resultsInnovationsDevRepository.save(newInnDev);
      }

      const saveOptionsAndSubOptions = async (options: Option[]) => {
        for (const optionData of options) {
          if (
            optionData.answer_boolean == null &&
            optionData.answer_text == null
          ) {
            continue;
          }
          const optionExist = await this._resultAnswerRepository.findOne({
            where: {
              result_id: resultId,
              result_question_id: optionData.result_question_id,
            },
          });

          if (optionExist) {
            optionExist.answer_boolean = optionData.answer_boolean;
            optionExist.answer_text = optionData.answer_text;
            optionExist.last_updated_by = user.id;
            await this._resultAnswerRepository.save(optionExist);
          } else {
            const optionAnswer = new ResultAnswer();
            optionAnswer.result_question_id = optionData.result_question_id;
            optionAnswer.answer_boolean = optionData.answer_boolean;
            optionAnswer.answer_text = optionData.answer_text;
            optionAnswer.result_id = resultId;
            optionAnswer.created_by = user.id;
            optionAnswer.last_updated_by = user.id;

            await this._resultAnswerRepository.save(optionAnswer);
          }

          for (const subOptionData of optionData.subOptions) {
            if (
              subOptionData.answer_boolean === null &&
              subOptionData.answer_text === null
            ) {
              continue;
            }
            const subOptionExist = await this._resultAnswerRepository.findOne({
              where: {
                result_id: resultId,
                result_question_id: subOptionData.result_question_id,
              },
            });
            if (subOptionExist) {
              subOptionExist.answer_boolean = subOptionData.answer_boolean;
              subOptionExist.answer_text = subOptionData.answer_text;
              subOptionExist.last_updated_by = user.id;
              await this._resultAnswerRepository.save(subOptionExist);
            } else {
              const subOptionAnswer = new ResultAnswer();
              subOptionAnswer.result_question_id =
                subOptionData.result_question_id;
              subOptionAnswer.answer_boolean = subOptionData.answer_boolean;
              subOptionAnswer.answer_text = subOptionData.answer_text;
              subOptionAnswer.result_id = resultId;
              subOptionAnswer.created_by = user.id;
              subOptionAnswer.last_updated_by = user.id;

              await this._resultAnswerRepository.save(subOptionAnswer);
            }
          }
        }
      };

      await saveOptionsAndSubOptions(
        createInnovationDevDto?.responsible_innovation_and_scaling.q1.options,
      );
      await saveOptionsAndSubOptions(
        createInnovationDevDto?.responsible_innovation_and_scaling.q2.options,
      );
      await saveOptionsAndSubOptions(
        createInnovationDevDto?.intellectual_property_rights.q1.options,
      );
      await saveOptionsAndSubOptions(
        createInnovationDevDto?.intellectual_property_rights.q2.options,
      );
      await saveOptionsAndSubOptions(
        createInnovationDevDto?.intellectual_property_rights.q3.options,
      );
      await saveOptionsAndSubOptions(
        createInnovationDevDto?.innovation_team_diversity.options,
      );

      const saveEvidence = async (
        evidences: Evidence[],
        evidence_type_id: number,
      ) => {
        const existingEvidences = await this._evidenceRepository.find({
          where: {
            result_id: resultId,
            evidence_type_id: evidence_type_id,
          },
        });

        for (const existingEvidence of existingEvidences) {
          const matchingEvidence = evidences.find(
            (evidence) => evidence.link === existingEvidence.link,
          );

          if (matchingEvidence) {
            existingEvidence.link = matchingEvidence.link;
            existingEvidence.last_updated_by = user.id;
            await this._evidenceRepository.save(existingEvidence);
          } else {
            existingEvidence.is_active = 0;
            existingEvidence.last_updated_by = user.id;
            await this._evidenceRepository.save(existingEvidence);
          }
        }

        for (const evidence of evidences) {
          const evidenceExist = await this._evidenceRepository.findOne({
            where: {
              result_id: resultId,
              evidence_type_id: evidence_type_id,
              link: evidence.link,
            },
          });

          if (evidenceExist) {
            evidenceExist.link = evidence.link;
            evidenceExist.last_updated_by = user.id;
            await this._evidenceRepository.save(evidenceExist);
          } else {
            const newEvidence = new Evidence();
            newEvidence.result_id = resultId;
            newEvidence.evidence_type_id = evidence_type_id;
            newEvidence.link = evidence.link;
            newEvidence.created_by = user.id;
            newEvidence.last_updated_by = user.id;

            await this._evidenceRepository.save(newEvidence);
          }
        }
      };

      await saveEvidence(createInnovationDevDto.pictures, 3);
      await saveEvidence(createInnovationDevDto.reference_materials, 4);

      await this.saveAnticepatedInnoUser(
        resultId,
        user.id,
        createInnovationDevDto,
      );

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

      let actorsData = await this._resultActorRepository.find({
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
      return {
        response: {
          ...innDevExists,
          pictures,
          innovatonUse,
          reference_materials,
          result: result,
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
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
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
      } = policyChangesDto;

      let policyChangesData: ResultsPolicyChanges = undefined;
      if (resultsPolicyChanges) {
        resultsPolicyChanges.amount = amount || null;
        resultsPolicyChanges.last_updated_by = user.id;
        resultsPolicyChanges.policy_stage_id = policy_stage_id;
        resultsPolicyChanges.policy_type_id = policy_type_id;
        resultsPolicyChanges.status_amount = status_amount;
        policyChangesData = await this._resultsPolicyChangesRepository.save(
          resultsPolicyChanges,
        );
      } else {
        const newResultsPolicyChanges = new ResultsPolicyChanges();
        newResultsPolicyChanges.amount = amount || null;
        newResultsPolicyChanges.policy_stage_id = policy_stage_id;
        newResultsPolicyChanges.policy_type_id = policy_type_id;
        newResultsPolicyChanges.result_id = resultId;
        newResultsPolicyChanges.created_by = user.id;
        newResultsPolicyChanges.last_updated_by = user.id;
        newResultsPolicyChanges.status_amount = status_amount;
        policyChangesData = await this._resultsPolicyChangesRepository.save(
          newResultsPolicyChanges,
        );
      }

      if (institutions?.length) {
        let institutionsList: ResultsByInstitution[] = [];
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

  private async saveAnticepatedInnoUser(
    resultId: number,
    user: number,
    { innovatonUse: crtr }: CreateInnovationDevDto,
  ) {
    if (crtr?.actors?.length) {
      const { actors } = crtr;
      actors.map(async (el: ResultActor) => {
        let actorExists: ResultActor = null;

        if (el?.actor_type_id) {
          const { actor_type_id } = el;
          const whereOptions: any = {
            actor_type_id: el.actor_type_id,
            result_id: resultId,
            result_actors_id: el.result_actors_id,
          };

          if (!el?.result_actors_id) {
            switch (`${actor_type_id}`) {
              case '5':
                whereOptions.other_actor_type =
                  el?.other_actor_type || IsNull();
                break;
            }
            delete whereOptions.result_actors_id;
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
              result_id: resultId,
            },
          });
        } else if (!actorExists) {
          actorExists = await this._resultActorRepository.findOne({
            where: { actor_type_id: IsNull(), result_id: resultId },
          });
        }

        let saveActor;
        if (actorExists) {
          if (!el?.actor_type_id && el?.is_active !== false) {
            return {
              response: { status: 'Error' },
              message: 'The field actor type is required',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          saveActor = await this._resultActorRepository.update(
            actorExists.result_actors_id,
            {
              actor_type_id: this.isNullData(el?.actor_type_id),
              is_active: el.is_active == undefined ? true : el.is_active,
              has_men: this.isNullData(el?.has_men),
              has_men_youth: this.isNullData(el?.has_men_youth),
              has_women: this.isNullData(el?.has_women),
              has_women_youth: this.isNullData(el?.has_women_youth),
              last_updated_by: user,
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
          saveActor = await this._resultActorRepository.save({
            actor_type_id: el.actor_type_id,
            is_active: el.is_active,
            has_men: el.has_men,
            has_men_youth: el.has_men_youth,
            has_women: el.has_women,
            has_women_youth: el.has_women_youth,
            other_actor_type: el.other_actor_type,
            last_updated_by: user,
            created_by: user,
            result_id: resultId,
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
              resultId,
              el.institution_types_id,
              5,
            );
        }

        if (!ite && el?.id) {
          ite =
            await this._resultByIntitutionsTypeRepository.getNewResultByIdExists(
              resultId,
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
              last_updated_by: user,
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
            results_id: resultId,
            created_by: user,
            last_updated_by: user,
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
              result_id: resultId,
            },
          });
        } else if (!ripm) {
          ripm = await this._resultIpMeasureRepository.findOne({
            where: {
              unit_of_measure: IsNull(),
              result_id: resultId,
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
              last_updated_by: user,
              is_active: el.is_active == undefined ? true : el.is_active,
            },
          );
        } else {
          if (!el?.unit_of_measure) {
            return {
              response: { valid: false },
              message: 'The field Unit of Measure',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          await this._resultIpMeasureRepository.save({
            result_id: resultId,
            unit_of_measure: el?.unit_of_measure,
            created_by: user,
            last_updated_by: user,
          });
        }
      });
    }
  }

  isNullData(data: any) {
    return data == undefined ? null : data;
  }
}
