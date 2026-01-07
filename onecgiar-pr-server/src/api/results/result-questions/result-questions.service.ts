import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultQuestionsRepository } from './repository/result-questions.repository';
import { ResultAnswerRepository } from './repository/result-answers.repository';

@Injectable()
export class ResultQuestionsService {
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

      const scalingWithOptions = await Promise.all(
        topLevelQuestions.map(async (topLevelQuestion) => {
          const childQuestions = await this._resultQuestionRepository.find({
            where: {
              question_level: 2,
              parent_question_id: topLevelQuestion.result_question_id,
              version: 'P25',
            },
          });

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
            q1: questionsWithOptions[0],
            q2: questionsWithOptions[1],
            q3: questionsWithOptions[2],
            q4: questionsWithOptions[3],
          };
        }),
      );
      return scalingWithOptions;
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
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
            q4: questionsWithOptions[3],
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
}
