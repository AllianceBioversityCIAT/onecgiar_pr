import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultQuestionDto } from './dto/create-result-question.dto';
import { UpdateResultQuestionDto } from './dto/update-result-question.dto';
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

      return {
        response: {
          responsible_innovation_and_scaling: scaling[0],
          intellectual_property_rights: intellectual[0],
          innovation_team_diversity: innovation[0],
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlerError.returnErrorRes({ error, debug: true });
    }
  }

  async responsibleInnovationAndScaling(resultId: number): Promise<any> {
    try {
      const getAnswersForQuestion = async (
        questionId: number,
      ): Promise<any> => {
        return await this._resultAnswerRepository.find({
          select: ['answer_boolean', 'answer_text'],
          where: {
            result_id: resultId,
            result_question_id: questionId,
          },
        });
      };

      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 1,
          question_level: 1,
          result_type_id: 7,
        },
      });

      const mapSubOptions = async (subOptions: any[]) => {
        return Promise.all(
          subOptions.map(async (subOption) => {
            const answers = await getAnswersForQuestion(
              subOption.result_question_id,
            );
            return {
              ...subOption,
              answer_boolean:
                answers[0] === undefined ? null : answers[0].answer_boolean,
              answer_text:
                answers[0] === undefined ? null : answers[0].answer_text,
            };
          }),
        );
      };

      const mapOptions = async (options: any[]) => {
        return Promise.all(
          options.map(async (option) => {
            const answers = await getAnswersForQuestion(
              option.result_question_id,
            );
            const subOptions = await this._resultQuestionRepository.find({
              where: {
                question_level: 4,
                parent_question_id: option.result_question_id,
              },
            });
            const subOptionsWithAnswers = await mapSubOptions(subOptions);
            return {
              ...option,
              answer_boolean:
                answers[0] === undefined ? null : answers[0].answer_boolean,
              answer_text:
                answers[0] === undefined ? null : answers[0].answer_text,
              subOptions: subOptionsWithAnswers,
            };
          }),
        );
      };

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

              const optionsWithAnswers = await mapOptions(questionOptions);

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

  async intellectualPropertyRights(resultId: number) {
    try {
      const getAnswersForQuestion = async (
        questionId: number,
      ): Promise<any> => {
        return await this._resultAnswerRepository.find({
          select: ['answer_boolean', 'answer_text'],
          where: {
            result_id: resultId,
            result_question_id: questionId,
          },
        });
      };

      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 26,
          question_level: 1,
          result_type_id: 7,
        },
      });

      const mapSubOptions = async (subOptions: any[]) => {
        return Promise.all(
          subOptions.map(async (subOption) => {
            const answers = await getAnswersForQuestion(
              subOption.result_question_id,
            );
            return {
              ...subOption,
              answer_boolean:
                answers[0] === undefined ? null : answers[0].answer_boolean,
              answer_text:
                answers[0] === undefined ? null : answers[0].answer_text,
            };
          }),
        );
      };

      const mapOptions = async (options: any[]) => {
        return Promise.all(
          options.map(async (option) => {
            const answers = await getAnswersForQuestion(
              option.result_question_id,
            );
            const subOptions = await this._resultQuestionRepository.find({
              where: {
                question_level: 4,
                parent_question_id: option.result_question_id,
              },
            });
            const subOptionsWithAnswers = await mapSubOptions(subOptions);
            return {
              ...option,
              answer_boolean:
                answers[0] === undefined ? null : answers[0].answer_boolean,
              answer_text:
                answers[0] === undefined ? null : answers[0].answer_text,
              subOptions: subOptionsWithAnswers,
            };
          }),
        );
      };

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

              const optionsWithAnswers = await mapOptions(questionOptions);

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

  async innovationTeamDiversity(resultId: number) {
    try {
      const getAnswersForQuestion = async (
        questionId: number,
      ): Promise<any> => {
        return await this._resultAnswerRepository.find({
          select: ['answer_boolean', 'answer_text'],
          where: {
            result_id: resultId,
            result_question_id: questionId,
          },
        });
      };

      const topLevelQuestions = await this._resultQuestionRepository.find({
        where: {
          result_question_id: 38,
          question_level: 1,
          result_type_id: 7,
        },
      });

      const mapSubOptions = async (subOptions: any[]) => {
        return Promise.all(
          subOptions.map(async (subOption) => {
            const answers = await getAnswersForQuestion(
              subOption.result_question_id,
            );
            return {
              ...subOption,
              answer_boolean:
                answers[0] === undefined ? null : answers[0].answer_boolean,
              answer_text:
                answers[0] === undefined ? null : answers[0].answer_text,
            };
          }),
        );
      };

      const mapOptions = async (options: any[]) => {
        return Promise.all(
          options.map(async (option) => {
            const answers = await getAnswersForQuestion(
              option.result_question_id,
            );
            const subOptions = await this._resultQuestionRepository.find({
              where: {
                question_level: 4,
                parent_question_id: option.result_question_id,
              },
            });
            const subOptionsWithAnswers = await mapSubOptions(subOptions);
            return {
              ...option,
              answer_boolean:
                answers[0] === undefined ? null : answers[0].answer_boolean,
              answer_text:
                answers[0] === undefined ? null : answers[0].answer_text,
              subOptions: subOptionsWithAnswers,
            };
          }),
        );
      };

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
              const answers = await getAnswersForQuestion(
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

              const optionsWithAnswers = await mapOptions(questionOptions);

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
