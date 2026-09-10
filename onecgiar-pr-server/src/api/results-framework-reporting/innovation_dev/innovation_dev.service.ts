import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateInnovationDevDtoV2,
  OptionV2,
  SubOptionV2,
  TopLevelQuestionsV2,
} from './dto/create-innovation_dev_v2.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { InnovationDevelopmentDto } from '../../results/dto/review-update.dto';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from '../../results/summary/innovation_dev.service';
import { ResultsInnovationsDev } from '../../results/summary/entities/results-innovations-dev.entity';
import { In, Not, Repository } from 'typeorm';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { InnovationReadinessLevelByLevel } from './enum/innov-readiness-level.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { ResultAnswerRepository } from '../../results/result-questions/repository/result-answers.repository';
import { ResultAnswer } from '../../results/result-questions/entities/result-answers.entity';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { InnovationUseService } from '../innovation-use/innovation-use.service';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';

/**
 * One question inside a questionnaire group as the client echoes it back: the id of
 * the selected radio option plus its options. Both are optional because the payload
 * is whatever the GET served for the result's reporting phase (P2-3557), and the
 * `qN` slots of `TopLevelQuestionsV2` cannot say so themselves without breaking
 * assignability to the legacy V1 DTO.
 */
type QuestionV2 = {
  radioButtonValue?: number;
  options?: OptionV2[];
};

@Injectable()
export class InnovationDevService {
  private readonly logger = new Logger(InnovationDevService.name);
  constructor(
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _innoDevService: InnoDevService,
    private readonly _innovationUseService: InnovationUseService,
    @InjectRepository(ResultScalingStudyUrl)
    private readonly _resultScalingStudyUrlsRepository: Repository<ResultScalingStudyUrl>,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
    private readonly _resultByProjectRepository: ResultsByProjectsRepository,
    private readonly _resultsByCentersRepository: ResultsCenterRepository,
  ) {}

  async saveInnovationDev(
    createInnovationDevDto: CreateInnovationDevDtoV2,
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
        has_scaling_studies,
        scaling_studies_urls,
        ip_support_center_id,
      } = createInnovationDevDto;

      let InnDevRes: ResultsInnovationsDev = undefined;
      const innovationDevFields = this._buildInnovationDevFieldsFromDto(
        createInnovationDevDto,
      );

      if (innDevExists) {
        InnDevRes = await this._persistInnovationDevEntity(
          innDevExists.result_innovation_dev_id,
          innovationDevFields,
          user.id,
        );
      } else {
        const newInnDev = new ResultsInnovationsDev();
        newInnDev.created_by = user.id;
        newInnDev.results_id = +resultId;
        newInnDev.result_object = { id: +resultId } as any;
        newInnDev.last_updated_by = user.id;
        newInnDev.short_title = short_title;
        newInnDev.is_active = true;
        newInnDev.is_new_variety = is_new_variety;
        newInnDev.readiness_level = readiness_level;
        newInnDev.number_of_varieties = number_of_varieties;
        newInnDev.innovation_developers = innovation_developers;
        newInnDev.evidences_justification = evidences_justification;
        newInnDev.innovation_collaborators = innovation_collaborators;
        // Do not assign null PK — breaks MySQL AUTO_INCREMENT.
        if (result_innovation_dev_id != null) {
          newInnDev.result_innovation_dev_id = result_innovation_dev_id;
        }
        newInnDev.innovation_acknowledgement = innovation_acknowledgement;
        newInnDev.innovation_pdf = innovation_pdf;
        newInnDev.innovation_user_to_be_determined =
          innovation_user_to_be_determined;
        newInnDev.has_scaling_studies = has_scaling_studies;
        newInnDev.ip_support_center_id = ip_support_center_id;
        this._applyInnovationDevRelations(newInnDev, {
          innovation_readiness_level_id,
          innovation_nature_id,
          innovation_characterization_id,
        });
        InnDevRes = await this._resultsInnovationsDevRepository.save(newInnDev);
      }
      // * SAVING INNOVATION AND SCALING
      await this._saveNestedQuestionGroup(
        resultId,
        user.id,
        createInnovationDevDto?.responsible_innovation_and_scaling,
      );

      // * SAVING INTELLECTUAL PROPERTY RIGHTS
      await this._saveNestedQuestionGroup(
        resultId,
        user.id,
        createInnovationDevDto?.intellectual_property_rights,
      );

      // * SAVING DIVERSITY AND MEGATRENDS
      await this._saveSingleQuestion(
        resultId,
        user.id,
        createInnovationDevDto?.innovation_team_diversity,
      );
      await this._saveSingleQuestion(
        resultId,
        user.id,
        createInnovationDevDto?.megatrends,
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

      await this.syncBudgetForResults(resultId, user.id);
      await this.saveBillateralInvestment(
        resultId,
        user.id,
        createInnovationDevDto,
      );
      await this._innoDevService.savePartnerInvestment(
        user.id,
        createInnovationDevDto,
      );

      if (
        innovation_readiness_level_id >=
          InnovationReadinessLevelByLevel.Level_6 &&
        has_scaling_studies &&
        scaling_studies_urls?.length
      ) {
        await this._resultScalingStudyUrlsRepository.update(
          { result_innov_dev_id: InnDevRes.result_innovation_dev_id },
          { is_active: false },
        );

        const urlsToSave = scaling_studies_urls.map((url) => ({
          result_innov_dev_id: InnDevRes.result_innovation_dev_id,
          study_url: url,
          is_active: true,
          created_by: user.id,
        }));

        await this._resultScalingStudyUrlsRepository.save(urlsToSave);
      }

      const innovation_use = {
        actors: createInnovationDevDto.innovatonUse.actors ?? [],
        organization: createInnovationDevDto.innovatonUse.organization ?? [],
        measures: createInnovationDevDto.innovatonUse.measures ?? [],
      };

      // * Save InnovationUser
      await this._innovationUseService.saveAnticipatedInnoUser(
        resultId,
        user.id,
        innovation_use,
        null,
        innovation_user_to_be_determined,
      );

      await this._resultRepository.update(resultId, {
        last_updated_by: user.id,
        last_updated_date: new Date(),
      });

      return {
        response: InnDevRes,
        message: 'Results Innovations Dev has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

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

      const rbp = await this._resultByProjectRepository.find({
        where: {
          result_id: resultId,
          is_active: true,
        },
      });

      const bilateral_expected_investment =
        await this._resultBilateralBudgetRepository.find({
          where: {
            result_project_id: In(rbp.map((el) => el.id)),
            is_active: true,
          },
          relations: {
            obj_result_project: {
              obj_clarisa_project: true,
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

      let scaling_studies_urls: string[] = [];
      if (
        Number(innDevExists?.innovation_readiness_level_id) >=
        InnovationReadinessLevelByLevel.Level_6
      ) {
        const urls = await this._resultScalingStudyUrlsRepository.find({
          where: {
            result_innov_dev_id: innDevExists.result_innovation_dev_id,
            is_active: true,
          },
        });
        scaling_studies_urls = urls.map((u) => u.study_url);
      }

      const hasLeadCenter = await this._resultsByCentersRepository.findOne({
        where: {
          result_id: resultId,
          is_leading_result: true,
          is_active: true,
        },
      });

      const ipSupportCenter =
        await this._resultsInnovationsDevRepository.findOne({
          where: {
            result_object: { id: resultId },
            is_active: true,
          },
          relations: {
            ip_support_center_object: true,
          },
        });

      const ipSupportCenterId = hasLeadCenter
        ? hasLeadCenter.center_id
        : (ipSupportCenter?.ip_support_center_object?.code ?? null);

      return {
        response: {
          ...this._normalizeInnovationDevRecord(
            innDevExists ?? this._emptyInnovationDevRecord(resultId),
          ),
          pictures,
          innovatonUse,
          initiative_expected_investment,
          bilateral_expected_investment,
          institutions_expected_investment,
          scaling_studies_urls,
          reference_materials,
          result,
          has_lead_center: !!hasLeadCenter,
          ip_support_center_id: ipSupportCenterId,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  /**
   * Saves every question a nested questionnaire group actually carries (P2-3557).
   *
   * The `qN` keys are SLOTS, not a guarantee: `responsibleInnovationAndScalingV2`
   * pins them to `result_question_id` and serves only the slots the result's phase
   * owns, so from the 2026 phase on `responsible_innovation_and_scaling` arrives
   * with `q1`…`q3` and no `q4` — question 137 ("partners, policies and financial
   * mechanisms") was retired with no replacement. The client echoes back exactly
   * what the GET handed it, so naming the four slots one by one dereferenced an
   * absent `q4` and the whole section save died with
   * `Cannot read properties of undefined (reading 'radioButtonValue')`.
   *
   * Iterating the `qN` keys PRESENT in the payload keeps this independent of how
   * many questions a group has: retiring or adding a slot needs no change here,
   * in either group and in either direction.
   *
   * A slot the payload does not carry is left completely alone — see
   * `_saveSingleQuestion` for why "absent" must mean "do not call".
   */
  private async _saveNestedQuestionGroup(
    resultId: number,
    user: number,
    group: TopLevelQuestionsV2 | undefined | null,
  ): Promise<void> {
    if (group == null) return;

    const slots = group as unknown as Record<string, QuestionV2>;
    for (const slot of this._presentQuestionSlots(group)) {
      await this._saveSingleQuestion(resultId, user, slots[slot]);
    }
  }

  /**
   * The `qN` slots the payload carries, ordered by N so the write order does not
   * depend on key insertion order. Anything that is not a `qN` key (the group's own
   * `radioButtonValue` / `options`, plus the question metadata the GET spreads in)
   * is ignored.
   */
  private _presentQuestionSlots(group: TopLevelQuestionsV2): string[] {
    const slots = group as unknown as Record<string, QuestionV2>;
    return Object.keys(slots)
      .filter((key) => /^q\d+$/.test(key) && slots[key] != null)
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  }

  /**
   * Saves one question's options, or does nothing at all when the question is not
   * in the payload.
   *
   * "Absent means do not call" is deliberate, not defensive noise:
   * `saveOptionsAndSubOptions` forces `answer_boolean = false` on every option that
   * is not the selected radio (:527-537) and then deactivates the stored answers
   * (:581 / :594, via `_deactivateOtherAnswers` / `_deactivateAllAnswers`). Handing
   * it a question the client never sent would therefore wipe answers the user still
   * has, not merely skip them. `options` undefined is also not survivable inside it
   * — it iterates the array unguarded at :507 — so the guard has to live out here.
   *
   * An empty `options` array is a no-op inside that method too, so it is skipped
   * for the same result with one query less. A present question with a null
   * `radioButtonValue` still goes through, exactly as before: that is how clearing
   * a radio is persisted.
   */
  private async _saveSingleQuestion(
    resultId: number,
    user: number,
    question: QuestionV2 | undefined | null,
  ): Promise<void> {
    if (question == null) return;
    if (!Array.isArray(question.options) || question.options.length === 0) {
      return;
    }

    await this.saveOptionsAndSubOptions(
      resultId,
      user,
      question.radioButtonValue,
      question.options,
    );
  }

  async saveOptionsAndSubOptions(
    resultId: number,
    user: number,
    radioButtonValue: number,
    options: OptionV2[],
  ) {
    const isOptionV2 = (data: OptionV2 | SubOptionV2): data is OptionV2 => {
      return (data as OptionV2).subOptions !== undefined;
    };

    const allQuestionIds = new Set<number>();
    for (const optionData of options) {
      allQuestionIds.add(optionData.result_question_id);
      for (const subOptionData of optionData.subOptions ?? []) {
        allQuestionIds.add(subOptionData.result_question_id);
      }
    }

    const activeAnswers = await this._resultAnswerRepository.find({
      where: {
        result_id: resultId,
        result_question_id: In(Array.from(allQuestionIds)),
        is_active: true,
      },
    });

    const activeAnswerMap = new Map<number, ResultAnswer>();
    for (const answer of activeAnswers) {
      activeAnswerMap.set(answer.result_question_id, answer);
    }

    const saveAnswer = async (data: OptionV2 | SubOptionV2) => {
      // Preserve radioButtonValue logic: only applies to OptionV2, not SubOptionV2
      if (isOptionV2(data)) {
        if (
          radioButtonValue != null &&
          data.result_question_id === radioButtonValue
        ) {
          data.answer_boolean = true;
        } else {
          data.answer_boolean = false;
        }
      }

      if (data.answer_boolean == null && data.answer_text == null) {
        return;
      }

      const existingActiveAnswer = activeAnswerMap.get(data.result_question_id);

      if (existingActiveAnswer) {
        await this._updateExistingActiveAnswer(
          existingActiveAnswer,
          data,
          resultId,
          user,
        );
        activeAnswerMap.set(data.result_question_id, existingActiveAnswer);
      } else {
        await this._createNewAnswer(data, resultId, user);
      }
    };

    for (const optionData of options) {
      await saveAnswer(optionData);

      for (const subOptionData of optionData.subOptions ?? []) {
        await saveAnswer(subOptionData);
      }
    }
  }

  private async _updateExistingActiveAnswer(
    existingActiveAnswer: ResultAnswer,
    data: OptionV2 | SubOptionV2,
    resultId: number,
    user: number,
  ): Promise<void> {
    existingActiveAnswer.answer_boolean = data.answer_boolean;
    existingActiveAnswer.answer_text = data.answer_text
      ? data.answer_text
      : null;
    existingActiveAnswer.last_updated_by = user;
    await this._resultAnswerRepository.save(existingActiveAnswer);

    await this._deactivateOtherAnswers(
      resultId,
      data.result_question_id,
      existingActiveAnswer.result_answer_id,
      user,
    );
  }

  private async _createNewAnswer(
    data: OptionV2 | SubOptionV2,
    resultId: number,
    user: number,
  ): Promise<void> {
    await this._deactivateAllAnswers(resultId, data.result_question_id, user);

    const newAnswer = new ResultAnswer();
    newAnswer.result_question_id = data.result_question_id;
    newAnswer.answer_boolean = data.answer_boolean;
    newAnswer.answer_text = data.answer_text ? data.answer_text : null;
    newAnswer.result_id = resultId;
    newAnswer.is_active = true;
    newAnswer.created_by = user;
    newAnswer.last_updated_by = user;

    await this._resultAnswerRepository.save(newAnswer);
  }

  private async _deactivateOtherAnswers(
    resultId: number,
    resultQuestionId: number,
    excludeAnswerId: number,
    user: number,
  ): Promise<void> {
    await this._resultAnswerRepository.update(
      {
        result_id: resultId,
        result_question_id: resultQuestionId,
        result_answer_id: Not(excludeAnswerId),
      },
      {
        is_active: false,
        last_updated_by: user,
      },
    );
  }

  private async _deactivateAllAnswers(
    resultId: number,
    resultQuestionId: number,
    user: number,
  ): Promise<void> {
    await this._resultAnswerRepository.update(
      {
        result_id: resultId,
        result_question_id: resultQuestionId,
      },
      {
        is_active: false,
        last_updated_by: user,
      },
    );
  }

  async syncBudgetForResults(resultId: number, userId: number) {
    const resultProjects = await this._resultByProjectRepository.find({
      where: { result_id: resultId, is_active: true },
    });

    if (!resultProjects.length) return;

    for (const rp of resultProjects) {
      const existingBudget =
        await this._resultBilateralBudgetRepository.findOne({
          where: {
            result_project_id: rp.id,
            is_active: true,
          },
        });

      if (!existingBudget) {
        const newBudget = this._resultBilateralBudgetRepository.create({
          result_project_id: rp.id,
          is_active: true,
          created_by: userId,
        });

        await this._resultBilateralBudgetRepository.save(newBudget);
      }
    }
  }

  async saveBillateralInvestment(
    resultId: number,
    user: number,
    { bilateral_expected_investment: inv }: CreateInnovationDevDtoV2,
  ) {
    try {
      if (!this.isValidInvestment(inv, resultId)) {
        return { valid: true };
      }

      for (const i of inv) {
        await this.processInvestment(i, resultId, user);
      }
      return { valid: true };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private isValidInvestment(inv: any, resultId: number): boolean {
    if (!inv || !Array.isArray(inv) || inv.length === 0) {
      this.logger.log(
        `[saveBillateralInvestment] No investment_bilateral provided for resultId: ${resultId}. Continuing flow.`,
      );
      return false;
    }
    return true;
  }

  private async processInvestment(i: any, resultId: number, user: number) {
    const rbp = await this.findResultByProject(i, resultId);
    const rbb = await this.findBilateralBudget(rbp.id);

    if (rbb) {
      await this.updateBilateralBudget(rbb, i, user);
    } else {
      await this.createBilateralBudget(rbp.id, i, user);
    }
  }

  private async findResultByProject(i: any, resultId: number) {
    const projectId = i.obj_result_project?.project_id || i.project_id || i.id;

    const rbp = await this._resultByProjectRepository.findOne({
      where: {
        result_id: resultId,
        is_active: true,
        project_id: projectId,
      },
    });

    if (!rbp) {
      this.logger.error(
        `[saveBillateralInvestment] ResultByProject not found for resultId: ${resultId}, project_id: ${projectId}`,
      );
      throw new NotFoundException({
        message: `ResultByProject not found for resultId: ${resultId}, project_id: ${projectId}`,
        resultId,
        projectId,
      });
    }
    return rbp;
  }

  private async findBilateralBudget(resultProjectId: number) {
    return await this._resultBilateralBudgetRepository.findOne({
      where: {
        result_project_id: resultProjectId,
        is_active: true,
      },
    });
  }

  private async updateBilateralBudget(rbb: any, i: any, user: number) {
    rbb.kind_cash = i.is_determined === true ? null : Number(i.kind_cash);
    rbb.is_determined = i.is_determined;
    rbb.last_updated_by = user;
    rbb.non_pooled_projetct_id = null;

    await this._resultBilateralBudgetRepository.save(rbb);
  }

  private async createBilateralBudget(
    resultProjectId: number,
    i: any,
    user: number,
  ) {
    const newRbb = this._resultBilateralBudgetRepository.create({
      result_project_id: resultProjectId,
      non_pooled_projetct_id: null,
      kind_cash: i.is_determined === true ? null : Number(i.kind_cash),
      is_determined: i.is_determined,
      created_by: user,
      last_updated_by: user,
    });

    await this._resultBilateralBudgetRepository.save(newRbb);
  }

  async updateInnovationDevPartial(
    resultId: number,
    innovationDevDto: InnovationDevelopmentDto,
    user: TokenDto,
  ) {
    try {
      const innDevExists =
        await this._resultsInnovationsDevRepository.InnovationDevExists(
          resultId,
        );

      if (!innDevExists) {
        return {
          response: {},
          message: 'Innovation development record not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const partialUpdate: Partial<ResultsInnovationsDev> = {};

      if (innovationDevDto.innovation_nature_id !== undefined) {
        partialUpdate.innovation_nature_id =
          innovationDevDto.innovation_nature_id;
      }

      if (innovationDevDto.innovation_developers !== undefined) {
        partialUpdate.innovation_developers =
          innovationDevDto.innovation_developers;
      }

      if (innovationDevDto.innovation_readiness_level_id !== undefined) {
        partialUpdate.innovation_readiness_level_id =
          innovationDevDto.innovation_readiness_level_id;
      }

      if (innovationDevDto.level !== undefined) {
        partialUpdate.readiness_level = innovationDevDto.level;
      }

      const updatedInnDev = await this._persistInnovationDevEntity(
        innDevExists.result_innovation_dev_id,
        partialUpdate,
        user.id,
      );

      // Update or delete project budgets only if budget-related fields are present
      if (this._hasBudgetFields(innovationDevDto)) {
        await this._updateProjectBudgets(resultId, innovationDevDto, user.id);
      }

      return {
        response: updatedInnDev,
        message: 'Innovation development updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async _persistInnovationDevEntity(
    resultInnovationDevId: number,
    fields: Partial<ResultsInnovationsDev> & {
      innovation_readiness_level_id?: number | null;
      innovation_nature_id?: number | null;
      innovation_characterization_id?: number | null;
    },
    userId: number,
  ): Promise<ResultsInnovationsDev> {
    const entity = await this._resultsInnovationsDevRepository.findOne({
      where: {
        result_innovation_dev_id: resultInnovationDevId,
        is_active: true,
      },
    });

    if (!entity) {
      throw new NotFoundException({
        message: `Innovation development record ${resultInnovationDevId} not found`,
      });
    }

    const {
      innovation_readiness_level_id,
      innovation_nature_id,
      innovation_characterization_id,
      ...scalarFields
    } = fields;

    const scalarUpdate = this._pickDefinedFields({
      ...scalarFields,
      last_updated_by: userId,
    });

    Object.assign(entity, scalarUpdate);

    this._applyInnovationDevRelations(entity, {
      innovation_readiness_level_id,
      innovation_nature_id,
      innovation_characterization_id,
    });

    return this._resultsInnovationsDevRepository.save(entity);
  }

  private _buildInnovationDevFieldsFromDto(
    dto: CreateInnovationDevDtoV2,
  ): Partial<ResultsInnovationsDev> & {
    innovation_readiness_level_id?: number | null;
    innovation_nature_id?: number | null;
    innovation_characterization_id?: number | null;
  } {
    const fieldNames = [
      'short_title',
      'is_new_variety',
      'readiness_level',
      'number_of_varieties',
      'innovation_nature_id',
      'innovation_developers',
      'evidences_justification',
      'innovation_collaborators',
      'innovation_readiness_level_id',
      'innovation_characterization_id',
      'innovation_acknowledgement',
      'innovation_pdf',
      'innovation_user_to_be_determined',
      'has_scaling_studies',
      'ip_support_center_id',
    ] as const;

    const fields: Partial<ResultsInnovationsDev> & {
      innovation_readiness_level_id?: number | null;
      innovation_nature_id?: number | null;
      innovation_characterization_id?: number | null;
    } = {};

    for (const fieldName of fieldNames) {
      if (dto[fieldName] !== undefined) {
        fields[fieldName] = dto[fieldName] as never;
      }
    }

    return fields;
  }

  private _pickDefinedFields<T extends Record<string, unknown>>(
    fields: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  /**
   * The `results_innovations_dev` row is only created the first time the section is SAVED
   * (see `saveInnovationDev`), so a result whose Innovation Development section was never
   * filled in has no row at all and `InnovationDevExists` returns `undefined`.
   *
   * ⚠️ Returning nothing for the section is not an option: everything else in the payload
   * (evidences, budgets, anticipated users, lead center) lives in its own tables and does
   * exist, and the client replaces its whole form model with `response`. So the empty case
   * answers with the same key set, all null — the form renders blank but usable, and
   * `result_innovation_dev_id: null` tells the client (and `saveInnovationDev`) that the
   * row still has to be created.
   */
  private _emptyInnovationDevRecord(resultId: number) {
    return {
      result_innovation_dev_id: null,
      short_title: null,
      is_new_variety: null,
      number_of_varieties: null,
      innovation_developers: null,
      innovation_collaborators: null,
      readiness_level: null,
      evidences_justification: null,
      is_active: null,
      created_date: null,
      last_updated_date: null,
      results_id: Number(resultId),
      created_by: null,
      last_updated_by: null,
      innovation_characterization_id: null,
      innovation_nature_id: null,
      innovation_readiness_level_id: null,
      innovation_acknowledgement: null,
      innovation_pdf: null,
      innovation_user_to_be_determined: null,
      has_scaling_studies: null,
      previous_irl: null,
    };
  }

  private _normalizeInnovationDevRecord<T extends { is_new_variety?: unknown }>(
    record: T,
  ): T {
    return {
      ...record,
      is_new_variety:
        record?.is_new_variety == null
          ? null
          : Boolean(Number(record.is_new_variety)),
    };
  }

  private _applyInnovationDevRelations(
    entity: ResultsInnovationsDev,
    relations: {
      innovation_readiness_level_id?: number | null;
      innovation_nature_id?: number | null;
      innovation_characterization_id?: number | null;
    },
  ): void {
    const {
      innovation_readiness_level_id,
      innovation_nature_id,
      innovation_characterization_id,
    } = relations;

    if (innovation_readiness_level_id !== undefined) {
      entity.innovation_readiness_level =
        innovation_readiness_level_id == null
          ? null
          : ({ id: innovation_readiness_level_id } as any);
    }

    if (innovation_nature_id !== undefined) {
      entity.innovation_nature =
        innovation_nature_id == null
          ? null
          : ({ code: innovation_nature_id } as any);
    }

    if (innovation_characterization_id !== undefined) {
      entity.innovation_characterization =
        innovation_characterization_id == null
          ? null
          : ({ id: innovation_characterization_id } as any);
    }
  }

  private _hasBudgetFields(
    innovationDevDto: InnovationDevelopmentDto,
  ): boolean {
    return (
      innovationDevDto.budget_id !== undefined ||
      innovationDevDto.kind_cash !== undefined ||
      innovationDevDto.is_determined !== undefined ||
      innovationDevDto.project_id !== undefined
    );
  }

  private async _updateProjectBudgets(
    resultId: number,
    innovationDevDto: InnovationDevelopmentDto,
    userId: number,
  ): Promise<void> {
    try {
      // If project_id is explicitly provided (not null), process the investment
      if (
        innovationDevDto.project_id !== null &&
        innovationDevDto.project_id !== undefined
      ) {
        await this.processInvestment(
          {
            id: innovationDevDto.budget_id,
            project_id: innovationDevDto.project_id,
            kind_cash: innovationDevDto.kind_cash,
            is_determined: innovationDevDto.is_determined,
          },
          resultId,
          userId,
        );
      } else if (innovationDevDto.project_id === null) {
        // If project_id is explicitly null, delete existing budgets
        await this._deleteProjectBudgetsForResult(resultId, userId);
      }
      // If project_id is undefined (not provided), do nothing to preserve existing budgets
    } catch (error) {
      this.logger.error(
        `Error updating project budgets for result ${resultId}: ${error.message}`,
      );
      // No throw error to not interrupt the main flow
    }
  }

  private async _deleteProjectBudgetsForResult(
    resultId: number,
    userId: number,
  ): Promise<void> {
    try {
      // Get all result_project_id for this result
      const resultProjects = await this._resultByProjectRepository.find({
        where: { result_id: resultId, is_active: true },
      });

      if (resultProjects.length === 0) {
        return;
      }

      const resultProjectIds = resultProjects.map((rp) => rp.id);

      // Delete (deactivate) all associated budgets
      const budgets = await this._resultBilateralBudgetRepository.find({
        where: {
          result_project_id: In(resultProjectIds),
          is_active: true,
        },
      });

      if (budgets && budgets.length > 0) {
        for (const budget of budgets) {
          budget.is_active = false;
          budget.last_updated_by = userId;
        }
        await this._resultBilateralBudgetRepository.save(budgets);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting project budgets for result ${resultId}: ${error.message}`,
      );
      // No throw error to not interrupt the main flow
    }
  }
}
