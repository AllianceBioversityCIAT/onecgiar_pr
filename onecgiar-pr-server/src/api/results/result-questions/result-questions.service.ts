import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultQuestionsRepository } from './repository/result-questions.repository';
import { ResultAnswerRepository } from './repository/result-answers.repository';
import {
  isConsolidatedIprQuestion,
  isGesiStageQuestion,
  isReducedInnovationDevForm,
  isRiskStageQuestion,
} from './innovation-dev-questions.const';

/** Bilateral innovation-dev questionnaire: PRMS prompt as `question`; answers via `text` / `boolean` and/or `selections`. */
export type InnovationDevCleanAnswer = {
  boolean?: boolean;
  text?: string;
  /** Multi-select (e.g. megatrends): one string per ticked option, same order as in the form. */
  selections?: string[];
};

export type InnovationDevCleanQuestion = {
  question: string;
  question_id: number;
  answer: InnovationDevCleanAnswer | null;
  /** Sub-rows only if the result positively selected them (`true` or non-empty text). */
  selected_sub_options?: InnovationDevCleanQuestion[];
};

export type InnovationDevCleanQuestionnaire = {
  responsible_innovation_and_scaling: InnovationDevCleanQuestion[];
  intellectual_property_rights: InnovationDevCleanQuestion[];
  innovation_team_diversity: InnovationDevCleanQuestion[];
  megatrends: InnovationDevCleanQuestion[];
};

@Injectable()
export class ResultQuestionsService {
  /** Upper bound on label length before stripping; avoids unbounded work on hostile input. */
  private static readonly BILATERAL_LABEL_MAX_CHARS = 16_384;

  /**
   * P25 "Responsible innovation and scaling" (parent question 77) is served to the client as four
   * fixed slots `q1`…`q4`, each one wired to a different component in the Innovation Development
   * form. Resolving those slots by ARRAY POSITION is unsafe: `find()` carries no `ORDER BY`, so the
   * order is whatever MySQL returns, and the moment a child row is added, removed or reordered every
   * slot after the gap shifts and the client renders the wrong question under the wrong component —
   * for every P25 result, phase 2025 ones included.
   *
   * The slots are therefore pinned to `result_question_id`. A missing row leaves its own slot
   * `undefined` and moves nothing else. Ids verified against prtest on 26 Aug 2026
   * (`GET /v2/api/results/questions/innovation-development/{10000,11000}`): 78, 79, 136, 137.
   *
   * A child of 77 that is not listed here is not exposed — adding a fifth question is a code change
   * here, on purpose, so that no row silently takes another question's slot.
   */
  private static readonly RESPONSIBLE_INNOVATION_SCALING_P25_SLOTS: ReadonlyArray<
    readonly [slot: 'q1' | 'q2' | 'q3' | 'q4', questionId: number]
  > = [
    ['q1', 78],
    ['q2', 79],
    ['q3', 136],
    ['q4', 137],
  ];

  /** P25 'Intellectual property rights' (parent 100). Ids verified against prtest 28 Aug 2026
   *  (GET /v2/api/results/questions/innovation-development/{8927,9142}): 101, 102, 103, 138.
   *  Pinned by id so that adding or removing a child of 100 (P2-3272 / P2-3513) cannot shift the
   *  other slots for phase-2025 results. */
  private static readonly INTELLECTUAL_PROPERTY_RIGHTS_P25_SLOTS: ReadonlyArray<
    readonly [slot: 'q1' | 'q2' | 'q3' | 'q4', questionId: number]
  > = [
    ['q1', 101],
    ['q2', 102],
    ['q3', 103],
    ['q4', 138],
  ];

  /** Pins `q1`…`q4` to `result_question_id` so a removed question cannot shift the other slots. */
  private assignQuestionSlotsById(
    questions: any[],
    slots: ReadonlyArray<readonly [string, number]>,
  ): Record<string, any> {
    const byId = new Map<number, any>();
    for (const q of questions ?? []) {
      const id = Number(q?.result_question_id);
      if (Number.isFinite(id)) byId.set(id, q);
    }

    const out: Record<string, any> = {};
    for (const [slot, questionId] of slots) {
      out[slot] = byId.get(questionId);
    }
    return out;
  }

  constructor(
    private readonly _handlerError: HandlersError,
    private readonly _resultQuestionRepository: ResultQuestionsRepository,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
  ) {}

  async findQuestionInnovationDevelopment(resultId: number) {
    try {
      const scaling = await this.responsibleInnovationAndScaling(resultId);
      const intellectual = await this.intellectualPropertyRights(resultId);
      const innovation = await this.innovationTeamDiversity(resultId);
      const megatrends = await this.getMegatrends(resultId);

      return {
        response: {
          responsible_innovation_and_scaling: scaling[0],
          intellectual_property_rights: intellectual[0],
          innovation_team_diversity: innovation[0],
          megatrends,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async findQuestionInnovationDevelopmentV2(resultId: number) {
    try {
      const scaling = await this.responsibleInnovationAndScalingV2(resultId);
      const intellectual = await this.intellectualPropertyRightsV2(resultId);
      const innovation = await this.innovationTeamDiversityV2(resultId);
      const megatrends = await this.getMegatrendsV2(resultId);

      return {
        response: {
          responsible_innovation_and_scaling: scaling[0],
          intellectual_property_rights: intellectual[0],
          innovation_team_diversity: innovation[0],
          megatrends,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  private getAnswersForQuestion(resultId: number, questionId: number) {
    return this._resultAnswerRepository.find({
      select: ['answer_boolean', 'answer_text'],
      where: {
        result_id: resultId,
        result_question_id: questionId,
      },
    });
  }

  private mapOptions(resultId: number, options: any[]) {
    return Promise.all(
      options.map(async (option) => {
        const answers = await this.getAnswersForQuestion(
          resultId,
          option.result_question_id,
        );

        const firstAnswer = answers?.[0];
        const mappedOption: any = {
          ...Object.fromEntries(
            Object.entries(option).filter(([key]) => key !== 'subOptions'),
          ),
          answer_boolean:
            firstAnswer === undefined ? null : firstAnswer.answer_boolean,
          answer_text:
            firstAnswer === undefined ? null : firstAnswer.answer_text,
        };

        if (option.subOptions && option.subOptions.length > 0) {
          mappedOption.subOptions = option.subOptions;
        }

        return mappedOption;
      }),
    );
  }

  async findQuestionPolicyChange(resultId: number) {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          question_level: 1,
          result_type_id: 1,
        },
      });

      const policyResultRelated = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const childQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
            },
          });

          const optionsWithAnswers = await this.mapOptions(
            resultId,
            childQuestions,
          );

          return {
            ...topLevelQuestion,
            optionsWithAnswers,
          };
        }),
      );

      const policyResultRelatedWithAnswers = policyResultRelated[0];
      return {
        response: policyResultRelatedWithAnswers,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async getMegatrends(resultId: number) {
    try {
      const megatrendQuestion = await this._resultQuestionRepository.findOne({
        where: { result_question_id: 52 },
      });

      const megatrendQuestionChildren =
        await this._resultQuestionRepository.find({
          where: {
            question_level: 2,
            parent_question_id: megatrendQuestion.result_question_id,
          },
        });

      const megatrendAnswers = await this.mapOptions(
        resultId,
        megatrendQuestionChildren,
      );

      return {
        ...megatrendQuestion,
        options: megatrendAnswers,
      };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async getMegatrendsV2(resultId: number) {
    try {
      const megatrendQuestion = await this._resultQuestionRepository.findOne({
        where: { result_question_id: 125 },
      });

      const megatrendQuestionChildren =
        await this._resultQuestionRepository.find({
          where: {
            question_level: 2,
            parent_question_id: megatrendQuestion.result_question_id,
          },
        });

      const megatrendAnswers = await this.mapOptions(
        resultId,
        megatrendQuestionChildren,
      );

      return {
        ...megatrendQuestion,
        options: megatrendAnswers,
      };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  private _mapMacroOptions(resultId: number, options: any[]) {
    return Promise.all(
      options.map(async (option) => {
        const answers = await this.getAnswersForQuestion(
          resultId,
          option.result_question_id,
        );
        const subOptions = await this._resultQuestionRepository.find({
          where: {
            question_level: 4,
            parent_question_id: option.result_question_id,
          },
        });
        const subOptionsWithAnswers = await this.mapOptions(
          resultId,
          subOptions,
        );
        return {
          ...option,
          answer_boolean:
            answers[0] === undefined ? null : answers[0].answer_boolean,
          answer_text: answers[0] === undefined ? null : answers[0].answer_text,
          subOptions: subOptionsWithAnswers,
        };
      }),
    );
  }

  private _mapMacroOptionsDiversity(resultId: number, options: any[]) {
    return Promise.all(
      options.map(async (option) => {
        const answers = await this.getAnswersForQuestion(
          resultId,
          option.result_question_id,
        );
        const subOptions = await this._resultQuestionRepository.find({
          where: {
            question_level: 4,
            parent_question_id: option.result_question_id,
          },
        });
        const subOptionsWithAnswers = await this.mapOptions(
          resultId,
          subOptions,
        );
        return {
          ...option,
          answer_boolean:
            answers[0] === undefined ? null : answers[0].answer_boolean,
          answer_text: answers[0] === undefined ? null : answers[0].answer_text,
          ...(subOptionsWithAnswers.length > 0 && {
            subOptions: subOptionsWithAnswers,
          }),
        };
      }),
    );
  }

  async responsibleInnovationAndScaling(resultId: number): Promise<any> {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 1,
          question_level: 1,
          result_type_id: 7,
        },
      });

      const scalingWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const childQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
            },
          });

          const questionsWithOptions = await Promise.all(
            childQuestions.map(async (childQuestion) => {
              const questionOptions = await this._resultQuestionRepository.find(
                {
                  where: {
                    question_level: 3,
                    parent_question_id: childQuestion.result_question_id,
                  },
                },
              );

              const optionsWithAnswers = await this._mapMacroOptions(
                resultId,
                questionOptions,
              );

              return {
                ...childQuestion,
                options: optionsWithAnswers,
              };
            }),
          );

          return {
            ...topLevelQuestion,
            q1: questionsWithOptions[0],
            q2: questionsWithOptions[1],
          };
        }),
      );
      return scalingWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async responsibleInnovationAndScalingV2(resultId: number): Promise<any> {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 77,
          question_level: 1,
          result_type_id: 7,
          version: 'P25',
        },
      });

      const phaseYear = await this.getResultPhaseYear(resultId);

      const scalingWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const allChildQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
              version: 'P25',
            },
          });

          const slots = this.resolveScalingSlotsForPhase(
            allChildQuestions,
            phaseYear,
          );

          // Only the questions that own a slot are worth walking: the rest would
          // cost an options query each and then be dropped by assignQuestionSlotsById.
          const slotIds = new Set(slots.map(([, id]) => id));
          const childQuestions = (allChildQuestions ?? []).filter((q) =>
            slotIds.has(Number(q.result_question_id)),
          );

          const questionsWithOptions = await Promise.all(
            childQuestions.map(async (childQuestion) => {
              const questionOptions = await this._resultQuestionRepository.find(
                {
                  where: {
                    question_level: 3,
                    parent_question_id: childQuestion.result_question_id,
                    version: 'P25',
                  },
                },
              );

              const optionsWithAnswers = await this._mapMacroOptions(
                resultId,
                questionOptions,
              );

              return {
                ...childQuestion,
                options: optionsWithAnswers,
              };
            }),
          );

          return {
            ...topLevelQuestion,
            ...this.assignQuestionSlotsById(
              questionsWithOptions,
              this.resolveScalingSlotsForPhase(allChildQuestions, phaseYear),
            ),
          };
        }),
      );
      return scalingWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Reporting phase year of a result, or `null` when it cannot be resolved.
   *
   * Read straight off the repository connection so the service keeps its current
   * dependencies: adding a constructor argument would ripple into every module
   * that provides `ResultQuestionsService` (`result-questions.module.ts`,
   * `results.module.ts`) and into the bilateral consumer.
   */
  private async getResultPhaseYear(resultId: number): Promise<number | null> {
    // A failure here must not take the whole questionnaire down: a null year falls
    // back to the pre-2026 form, which is the safe default for a read path.
    try {
      const rows: { phase_year: number | null }[] =
        await this._resultQuestionRepository.query(
          `
          SELECT v.phase_year AS phase_year
          FROM \`result\` r
            INNER JOIN version v ON v.id = r.version_id
          WHERE r.id = ?
            AND r.is_active = TRUE
          LIMIT 1;
        `,
          [resultId],
        );

      const phaseYear = rows?.[0]?.phase_year;

      return phaseYear == null ? null : Number(phaseYear);
    } catch {
      return null;
    }
  }

  /**
   * Slot table for the result's phase (P2-3467).
   *
   * Up to the 2025 phase the group is 78 / 79 / 136 / 137, pinned by id. From 2026
   * the GESI and risk open-text questions are retired and the two stage questions
   * take q1 and q2; "partners, policies and financial mechanisms" (137) has no
   * replacement, so q4 is left empty.
   *
   * The stage questions are matched by TEXT because their ids come from the
   * AUTO_INCREMENT of the migration that inserts them and differ across
   * environments. A question that cannot be found yields a slot id of NaN, which
   * `assignQuestionSlotsById` simply resolves to `undefined` — the section renders
   * without it rather than serving the wrong question.
   */
  private resolveScalingSlotsForPhase(
    childQuestions: any[],
    phaseYear: number | null,
  ): ReadonlyArray<readonly [string, number]> {
    if (!isReducedInnovationDevForm(phaseYear)) {
      return ResultQuestionsService.RESPONSIBLE_INNOVATION_SCALING_P25_SLOTS;
    }

    const idOfQuestion = (matches: (text: string) => boolean) => {
      const found = (childQuestions ?? []).find((q) =>
        matches(q?.question_text),
      );
      return found ? Number(found.result_question_id) : Number.NaN;
    };

    return [
      ['q1', idOfQuestion(isGesiStageQuestion)],
      ['q2', idOfQuestion(isRiskStageQuestion)],
      ['q3', 136],
    ];
  }

  /**
   * Slot table of the Intellectual Property group for the result's phase
   * (P2-3272 / P2-3513).
   *
   * Up to the 2025 phase the group is 101 / 102 / 103 / 138, pinned by id, so a
   * result of that phase keeps rendering its four original questions with the
   * answers already given — the governing rule of epic P2-3243.
   *
   * From 2026 the four are replaced by the single consolidated question, which
   * takes q1; q2, q3 and q4 are left empty. It is matched by TEXT because its id
   * comes from the AUTO_INCREMENT of the migration that inserts it and differs
   * across environments. Before that migration runs, the lookup yields NaN and
   * `assignQuestionSlotsById` resolves the slot to `undefined`: the group is
   * served with no children rather than with the wrong ones.
   */
  private resolveIprSlotsForPhase(
    childQuestions: any[],
    phaseYear: number | null,
  ): ReadonlyArray<readonly [string, number]> {
    if (!isReducedInnovationDevForm(phaseYear)) {
      return ResultQuestionsService.INTELLECTUAL_PROPERTY_RIGHTS_P25_SLOTS;
    }

    const consolidated = (childQuestions ?? []).find((q) =>
      isConsolidatedIprQuestion(q?.question_text),
    );

    return [
      [
        'q1',
        consolidated ? Number(consolidated.result_question_id) : Number.NaN,
      ],
    ];
  }

  async intellectualPropertyRights(resultId: number) {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 26,
          question_level: 1,
          result_type_id: 7,
        },
      });

      const intelectuaWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const childQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
            },
          });

          const questionsWithOptions = await Promise.all(
            childQuestions.map(async (childQuestion) => {
              const questionOptions = await this._resultQuestionRepository.find(
                {
                  where: {
                    question_level: 3,
                    parent_question_id: childQuestion.result_question_id,
                  },
                },
              );

              const optionsWithAnswers = await this._mapMacroOptions(
                resultId,
                questionOptions,
              );

              return {
                ...childQuestion,
                options: optionsWithAnswers,
              };
            }),
          );

          return {
            ...topLevelQuestion,
            q1: questionsWithOptions[0],
            q2: questionsWithOptions[1],
            q3: questionsWithOptions[2],
          };
        }),
      );

      return intelectuaWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async intellectualPropertyRightsV2(resultId: number) {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 100,
          question_level: 1,
          result_type_id: 7,
          version: 'P25',
        },
      });

      const phaseYear = await this.getResultPhaseYear(resultId);

      const intelectuaWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const allChildQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
            },
          });

          const slots = this.resolveIprSlotsForPhase(
            allChildQuestions,
            phaseYear,
          );

          // Only the questions that own a slot are worth walking: the rest would
          // cost an options query each and then be dropped by assignQuestionSlotsById.
          const slotIds = new Set(slots.map(([, id]) => id));
          const childQuestions = (allChildQuestions ?? []).filter((q) =>
            slotIds.has(Number(q.result_question_id)),
          );

          const questionsWithOptions = await Promise.all(
            childQuestions.map(async (childQuestion) => {
              const questionOptions = await this._resultQuestionRepository.find(
                {
                  where: {
                    question_level: 3,
                    parent_question_id: childQuestion.result_question_id,
                  },
                },
              );

              const optionsWithAnswers = await this._mapMacroOptions(
                resultId,
                questionOptions,
              );

              return {
                ...childQuestion,
                options: optionsWithAnswers,
              };
            }),
          );

          return {
            ...topLevelQuestion,
            ...this.assignQuestionSlotsById(questionsWithOptions, slots),
          };
        }),
      );

      return intelectuaWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async innovationTeamDiversity(resultId: number) {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 38,
          question_level: 1,
          result_type_id: 7,
        },
      });

      const innovationWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const childQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
            },
          });

          const questionsWithOptions = await Promise.all(
            childQuestions.map(async (childQuestion) => {
              const answers = await this.getAnswersForQuestion(
                resultId,
                childQuestion.result_question_id,
              );
              const questionOptions = await this._resultQuestionRepository.find(
                {
                  where: {
                    question_level: 3,
                    parent_question_id: childQuestion.result_question_id,
                  },
                },
              );

              const optionsWithAnswers = await this._mapMacroOptionsDiversity(
                resultId,
                questionOptions,
              );

              return {
                ...childQuestion,
                answer_boolean:
                  answers[0] === undefined ? null : answers[0].answer_boolean,
                answer_text:
                  answers[0] === undefined ? null : answers[0].answer_text,
                subOptions: optionsWithAnswers,
              };
            }),
          );

          return {
            ...topLevelQuestion,
            options: questionsWithOptions,
          };
        }),
      );

      return innovationWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async innovationTeamDiversityV2(resultId: number) {
    try {
      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 112,
          question_level: 1,
          result_type_id: 7,
          version: 'P25',
        },
      });

      const innovationWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const childQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
            },
          });

          const questionsWithOptions = await Promise.all(
            childQuestions.map(async (childQuestion) => {
              const answers = await this.getAnswersForQuestion(
                resultId,
                childQuestion.result_question_id,
              );
              const questionOptions = await this._resultQuestionRepository.find(
                {
                  where: {
                    question_level: 3,
                    parent_question_id: childQuestion.result_question_id,
                  },
                },
              );

              const optionsWithAnswers = await this._mapMacroOptionsDiversity(
                resultId,
                questionOptions,
              );

              return {
                ...childQuestion,
                answer_boolean:
                  answers[0] === undefined ? null : answers[0].answer_boolean,
                answer_text:
                  answers[0] === undefined ? null : answers[0].answer_text,
                subOptions: optionsWithAnswers,
              };
            }),
          );

          return {
            ...topLevelQuestion,
            options: questionsWithOptions,
          };
        }),
      );

      return innovationWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  private isInnovationDevHandlerErrorPayload(x: unknown): boolean {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    return (
      typeof o.status === 'number' &&
      typeof o.message === 'string' &&
      'response' in o &&
      !('question_text' in o)
    );
  }

  private innovationDevTrimmedAnswerText(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') {
      return String(v).trim();
    }
    return '';
  }

  private innovationDevQuestionLabel(v: unknown): string {
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') {
      return String(v).trim();
    }
    return '';
  }

  /** Positive selection or “other” text — used for `subOptions` only. */
  private hasStrictInnovationSelection(o: Record<string, unknown>): boolean {
    if (this.innovationDevTrimmedAnswerText(o.answer_text) !== '') {
      return true;
    }
    const b = o.answer_boolean;
    return b === true || b === 1;
  }

  private compactInnovationDevAnswer(
    o: Record<string, unknown>,
  ): InnovationDevCleanAnswer | null {
    const out: InnovationDevCleanAnswer = {};
    const t = this.innovationDevTrimmedAnswerText(o.answer_text);
    if (t !== '') {
      out.text = t;
    }
    const b = o.answer_boolean;
    if (b === true || b === false || b === 0 || b === 1) {
      out.boolean = Boolean(b);
    }
    return Object.keys(out).length ? out : null;
  }

  private simplifyInnovationDevOptionBranch(
    o: unknown,
  ): InnovationDevCleanQuestion | null {
    if (!o || typeof o !== 'object') return null;
    const row = o as Record<string, unknown>;
    const subRaw = Array.isArray(row.subOptions) ? row.subOptions : [];
    const selectedChildren = subRaw
      .map((s) => this.simplifyInnovationDevOptionBranch(s))
      .filter((n): n is InnovationDevCleanQuestion => n != null);

    const answered = this.hasStrictInnovationSelection(row);

    if (!answered && selectedChildren.length === 0) return null;

    const id = Number(row.result_question_id);
    if (!Number.isFinite(id)) return null;

    return {
      question: this.innovationDevQuestionLabel(row.question_text),
      question_id: id,
      answer: answered ? this.compactInnovationDevAnswer(row) : null,
      ...(selectedChildren.length
        ? { selected_sub_options: selectedChildren }
        : {}),
    };
  }

  /**
   * Strip simple HTML from catalog labels (e.g. `<b>Other</b>`) for bilateral text answers.
   * Uses a single linear pass (no tag regex) so runtime stays O(n) with n capped.
   */
  private stripHtmlForBilateralLabel(s: string): string {
    if (!s) return '';
    const max = ResultQuestionsService.BILATERAL_LABEL_MAX_CHARS;
    const input = s.length > max ? s.slice(0, max) : s;

    let out = '';
    for (let i = 0; i < input.length; ) {
      if (input[i] === '<') {
        let j = i + 1;
        while (j < input.length && input[j] !== '>') {
          j++;
        }
        if (j < input.length) {
          i = j + 1;
        } else {
          out += '<';
          i++;
        }
      } else {
        out += input[i];
        i++;
      }
    }

    return out.replaceAll(/\s+/g, ' ').trim();
  }

  /** Label for a selected catalog row (`question_text` + optional free-text answer). */
  private formatBilateralSelectedOptionLabel(
    row: Record<string, unknown>,
  ): string | null {
    const labelRaw = this.innovationDevQuestionLabel(row.question_text);
    const label = this.stripHtmlForBilateralLabel(labelRaw);
    const extra = this.innovationDevTrimmedAnswerText(row.answer_text);
    if (label && extra && extra !== label) {
      return `${label} (${extra})`;
    }
    if (label) return label;
    if (extra) return extra;
    return null;
  }

  private collectSelectedSubOptionsUnderMacroRows(
    selectedTopRows: Record<string, unknown>[],
  ): InnovationDevCleanQuestion[] {
    const acc: InnovationDevCleanQuestion[] = [];
    for (const row of selectedTopRows) {
      const subs = Array.isArray(row.subOptions) ? row.subOptions : [];
      for (const s of subs) {
        const n = this.simplifyInnovationDevOptionBranch(s);
        if (n) acc.push(n);
      }
    }
    return acc;
  }

  /**
   * Responsible innovation / IP rights: each `q1`…`q4` is the **question**; mutually exclusive
   * (or multi) **options** are only reflected in `answer.text`, not as separate `question` rows.
   */
  private flattenMacroSubquestionsSection(
    sectionRoot: unknown,
  ): InnovationDevCleanQuestion[] {
    if (!sectionRoot || typeof sectionRoot !== 'object') return [];
    if (this.isInnovationDevHandlerErrorPayload(sectionRoot)) return [];

    const root = sectionRoot as Record<string, unknown>;
    const out: InnovationDevCleanQuestion[] = [];

    for (const k of ['q1', 'q2', 'q3', 'q4'] as const) {
      const q = root[k];
      if (!q || typeof q !== 'object') continue;
      const qRec = q as Record<string, unknown>;
      if (!Array.isArray(qRec.options)) continue;

      const qText = this.innovationDevQuestionLabel(qRec.question_text);
      const qId = Number(qRec.result_question_id);
      if (!qText || !Number.isFinite(qId)) continue;

      const selected = (qRec.options as unknown[]).filter(
        (o): o is Record<string, unknown> =>
          !!o &&
          typeof o === 'object' &&
          this.hasStrictInnovationSelection(o as Record<string, unknown>),
      );

      if (!selected.length) continue;

      const parts = selected
        .map((r) => this.formatBilateralSelectedOptionLabel(r))
        .filter((p): p is string => p != null && p !== '');

      if (!parts.length) continue;

      const subOpts = this.collectSelectedSubOptionsUnderMacroRows(selected);

      out.push({
        question: qText,
        question_id: qId,
        answer: { text: parts.join(' | ') },
        ...(subOpts.length ? { selected_sub_options: subOpts } : {}),
      });
    }

    return out;
  }

  /**
   * Innovation team diversity: one parent prompt + rows; selected rows only in `answer.text`,
   * nested `subOptions` only under selected rows.
   */
  private flattenInnovationTeamDiversitySection(
    sectionRoot: unknown,
  ): InnovationDevCleanQuestion[] {
    if (!sectionRoot || typeof sectionRoot !== 'object') return [];
    if (this.isInnovationDevHandlerErrorPayload(sectionRoot)) return [];

    const root = sectionRoot as Record<string, unknown>;
    const opts = root.options;
    if (!Array.isArray(opts)) return [];

    const parentQuestion =
      this.innovationDevQuestionLabel(root.question_text) ||
      'Innovation team diversity';
    const parentId = Number(root.result_question_id);
    if (!Number.isFinite(parentId)) return [];

    const selected = opts.filter(
      (o): o is Record<string, unknown> =>
        !!o &&
        typeof o === 'object' &&
        this.hasStrictInnovationSelection(o as Record<string, unknown>),
    );

    if (!selected.length) return [];

    const parts = selected
      .map((r) => this.formatBilateralSelectedOptionLabel(r))
      .filter((p): p is string => p != null && p !== '');

    if (!parts.length) return [];

    const subOpts = this.collectSelectedSubOptionsUnderMacroRows(selected);

    return [
      {
        question: parentQuestion,
        question_id: parentId,
        answer: { text: parts.join(' | ') },
        ...(subOpts.length ? { selected_sub_options: subOpts } : {}),
      },
    ];
  }

  /**
   * Megatrends UI: one parent prompt + checkbox list. Bilateral exposes **parent** as `question`
   * and each ticked option as one entry in **`answer.selections`** (not a single pipe-delimited string).
   */
  private flattenMegatrendsInnovationDevSection(
    megatrendsRoot: unknown,
  ): InnovationDevCleanQuestion[] {
    if (!megatrendsRoot || typeof megatrendsRoot !== 'object') return [];
    if (this.isInnovationDevHandlerErrorPayload(megatrendsRoot)) return [];

    const root = megatrendsRoot as Record<string, unknown>;
    const opts = root.options;
    if (!Array.isArray(opts)) return [];

    const parentId = Number(root.result_question_id);
    if (!Number.isFinite(parentId)) return [];

    const parentQuestion =
      this.innovationDevQuestionLabel(root.question_text) || 'Megatrends';

    const selectedLabels: string[] = [];
    for (const raw of opts) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      if (!this.hasStrictInnovationSelection(row)) continue;
      const line = this.formatBilateralSelectedOptionLabel(row);
      if (line) selectedLabels.push(line);
    }

    if (!selectedLabels.length) return [];

    return [
      {
        question: parentQuestion,
        question_id: parentId,
        answer: { selections: selectedLabels },
      },
    ];
  }

  /**
   * Innovation Development for bilateral: **question → answer** per section.
   * Reuses the same loaders as PRMS (`findQuestionInnovationDevelopment` / `V2`).
   * Macro `q1`–`q4` and team diversity use **selected** option label(s) in `answer.text`.
   * Megatrends (multi-select) uses **`answer.selections`** (one string per checked option).
   * `selected_sub_options`: only
   * positively selected sub-rows (`answer_boolean` true / 1, or non-empty `answer_text`).
   */
  async buildInnovationDevelopmentQuestionnaireForBilateral(
    resultId: number,
    portfolioAcronym: string | null | undefined,
  ): Promise<InnovationDevCleanQuestionnaire> {
    const isP25 =
      String(portfolioAcronym ?? '')
        .trim()
        .toUpperCase() === 'P25';

    if (isP25) {
      const [scaling, intellectual, innovation, megatrends] = await Promise.all(
        [
          this.responsibleInnovationAndScalingV2(resultId),
          this.intellectualPropertyRightsV2(resultId),
          this.innovationTeamDiversityV2(resultId),
          this.getMegatrendsV2(resultId),
        ],
      );
      return {
        responsible_innovation_and_scaling:
          this.flattenMacroSubquestionsSection(
            Array.isArray(scaling) ? scaling[0] : null,
          ),
        intellectual_property_rights: this.flattenMacroSubquestionsSection(
          Array.isArray(intellectual) ? intellectual[0] : null,
        ),
        innovation_team_diversity: this.flattenInnovationTeamDiversitySection(
          Array.isArray(innovation) ? innovation[0] : null,
        ),
        megatrends: this.flattenMegatrendsInnovationDevSection(megatrends),
      };
    }

    const [scaling, intellectual, innovation, megatrends] = await Promise.all([
      this.responsibleInnovationAndScaling(resultId),
      this.intellectualPropertyRights(resultId),
      this.innovationTeamDiversity(resultId),
      this.getMegatrends(resultId),
    ]);
    return {
      responsible_innovation_and_scaling: this.flattenMacroSubquestionsSection(
        Array.isArray(scaling) ? scaling[0] : null,
      ),
      intellectual_property_rights: this.flattenMacroSubquestionsSection(
        Array.isArray(intellectual) ? intellectual[0] : null,
      ),
      innovation_team_diversity: this.flattenInnovationTeamDiversitySection(
        Array.isArray(innovation) ? innovation[0] : null,
      ),
      megatrends: this.flattenMegatrendsInnovationDevSection(megatrends),
    };
  }
}
