import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicatorsRepository } from './repositories/contribution-to-indicators.repository';
import { ContributionToIndicatorResultsRepository } from './repositories/contribution-to-indicator-result.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ContributionToIndicatorsDto } from './dto/contribution-to-indicators.dto';
import { ContributionToIndicatorResult } from './entities/contribution-to-indicator-result.entity';
import { ContributionToIndicator } from './entities/contribution-to-indicator.entity';
import { ContributionToIndicatorResultsDto } from './dto/contribution-to-indicator-results.dto';
import { ContributionToIndicatorSubmissionRepository } from './repositories/contribution-to-indicator-result-submission.repository';
import { ContributionToIndicatorSubmission } from './entities/contribution-to-indicator-submission.entity';
import { ResultStatusData } from '../../shared/constants/result-status.enum';

@Injectable()
export class ContributionToIndicatorsService {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorsService.name,
  );
  constructor(
    private readonly _contributionToIndicatorsRepository: ContributionToIndicatorsRepository,
    private readonly _contributionToIndicatorResultsRepository: ContributionToIndicatorResultsRepository,
    private readonly _contributionToIndicatorSubmissionRepository: ContributionToIndicatorSubmissionRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAllToCResultsByInitiativeCode(
    initiativeCode: string,
    isOutcome: boolean,
  ) {
    try {
      if (!initiativeCode?.length) {
        throw {
          response: {},
          message: 'missing data: initiativeCode',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const data = isOutcome
        ? await this._contributionToIndicatorsRepository.findAllOutcomesByInitiativeCode(
            initiativeCode,
          )
        : await this._contributionToIndicatorsRepository.findAllEoisByInitiativeCode(
            initiativeCode,
          );

      return {
        response: data,
        message:
          'The Contributor to Indicators list has been fetched successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async create(tocId: string, user: TokenDto) {
    try {
      if (!tocId?.length) {
        throw {
          response: {},
          message: 'missing data: tocId',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      let contribution: ContributionToIndicator =
        await this._contributionToIndicatorsRepository.findOneBy({
          toc_result_id: tocId,
        });

      if (contribution) {
        if (contribution.is_active) {
          throw {
            response: {},
            message: `Contribution to indicator with tocId "${tocId}" already exists`,
            status: HttpStatus.CONFLICT,
          };
        }

        contribution.is_active = true;
        await this._contributionToIndicatorsRepository.update(
          {
            id: contribution.id,
          },
          contribution,
        );
      } else {
        contribution = await this._contributionToIndicatorsRepository.save({
          created_by: user.id,
          toc_result_id: tocId,
        });
      }

      const addSubmission = await this.changeSubmissionState(
        user,
        null,
        contribution,
      );

      if (addSubmission.status !== HttpStatus.OK) {
        throw {
          response: addSubmission.message,
          message: `Error creating submission for Contribution to Indicator with tocId "${tocId}"`,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      return {
        response: contribution,
        message: `The Contributor to Indicator to tocId ${tocId} has been created.`,
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneCoIResultByTocId(tocId: string) {
    try {
      function removeInactives(list: ContributionToIndicatorResultsDto[]) {
        return list
          .filter((contribution) =>
            contribution.contribution_id ? !!contribution.is_active : true,
          )
          .map((contribution) => {
            if (contribution.linked_results?.length) {
              contribution.linked_results = removeInactives(
                contribution.linked_results,
              );
            }

            return contribution;
          });
      }

      if (!tocId?.length) {
        throw {
          response: {},
          message: 'missing data: tocId',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const exists = await this._contributionToIndicatorsRepository.existsBy({
        toc_result_id: tocId,
        is_active: true,
      });

      if (!exists) {
        throw {
          response: {},
          message: `Contribution to indicator with tocId "${tocId}" not found`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const contributionToIndicator =
        await this._contributionToIndicatorResultsRepository.findBasicContributionIndicatorDataByTocId(
          tocId,
        );

      const contributingResults =
        await this._contributionToIndicatorResultsRepository.findResultContributionsByTocId(
          tocId,
        );
      contributionToIndicator.contributing_results =
        removeInactives(contributingResults);

      return {
        response: contributionToIndicator,
        message: 'The Contributor to Indicator has been found.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async update(
    contributionToIndicatorDto: ContributionToIndicatorsDto,
    userDto: TokenDto,
  ) {
    try {
      if (!contributionToIndicatorDto.contribution_id) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const contributionToIndicator =
        await this._contributionToIndicatorsRepository.findOne({
          where: {
            id: contributionToIndicatorDto.contribution_id,
            is_active: true,
          },
          relations: { contribution_to_indicator_result_array: true },
        });

      if (!contributionToIndicator) {
        throw {
          response: {},
          message: `Contribution to indicator with id "${contributionToIndicatorDto.contribution_id}" not found`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      await this._contributionToIndicatorsRepository.update(
        contributionToIndicatorDto.contribution_id,
        {
          last_updated_by: userDto.id,
          achieved_in_2024: contributionToIndicatorDto.achieved_in_2024,
          narrative_achieved_in_2024:
            contributionToIndicatorDto.narrative_achieved_in_2024,
        },
      );

      await this._handleContributingResults(
        contributionToIndicatorDto,
        userDto,
        contributionToIndicator,
      );

      return {
        response: contributionToIndicator,
        message: 'The Contributor to Indicator has been updated.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private async _handleContributingResults(
    contributionToIndicatorDto: ContributionToIndicatorsDto,
    userDto: TokenDto,
    contributionToIndicator: ContributionToIndicator,
  ) {
    function recursive(
      contributingResults: ContributionToIndicatorResultsDto[],
      contributionToIndicatorResultsRepository: ContributionToIndicatorResultsRepository,
      processedContributingResults: ContributionToIndicatorResult[] = [],
    ): ContributionToIndicatorResult[] {
      for (const result of contributingResults) {
        let contributingResult: ContributionToIndicatorResult =
          contributionToIndicator.contribution_to_indicator_result_array?.find(
            (ctir) =>
              result.contribution_id
                ? ctir.id === result.contribution_id
                : ctir.result_id === result.result_id,
          );
        if (!contributingResult) {
          contributingResult = contributionToIndicatorResultsRepository.create({
            created_by: userDto.id,
            contribution_to_indicator_id:
              contributionToIndicatorDto.contribution_id,
            result_id: result.result_id,
            is_active: result.is_active ?? true,
          });
        }

        if (!contributingResult) {
          throw {
            response: {},
            message: `Contribution to indicator result with id "${result.contribution_id}" not found`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        if (result.is_active != undefined) {
          contributingResult.is_active = result.is_active;
        }
        contributingResult.last_updated_by = userDto.id;

        processedContributingResults.push(contributingResult);

        if (result.linked_results) {
          processedContributingResults = recursive(
            result.linked_results ?? [],
            contributionToIndicatorResultsRepository,
            processedContributingResults,
          );
        }
      }

      return processedContributingResults;
    }

    const contributingResultArray: ContributionToIndicatorResult[] = recursive(
      contributionToIndicatorDto.contributing_results,
      this._contributionToIndicatorResultsRepository,
    );

    await this._contributionToIndicatorResultsRepository.save(
      contributingResultArray,
    );
  }

  async changeSubmissionState(
    user: TokenDto,
    tocId?: string,
    incomingContributionToIndicator?: ContributionToIndicator,
  ) {
    try {
      let contributionToIndicator: ContributionToIndicator =
        incomingContributionToIndicator;
      const isNew: boolean = !!incomingContributionToIndicator;
      if (!contributionToIndicator?.id) {
        if (!tocId?.length) {
          throw {
            response: {},
            message: 'missing data: tocId',
            status: HttpStatus.BAD_REQUEST,
          };
        }

        contributionToIndicator =
          await this._contributionToIndicatorsRepository.findOne({
            where: {
              toc_result_id: tocId,
              is_active: true,
            },
            relations: { contribution_to_indicator_submission_array: true },
          });

        if (!contributionToIndicator) {
          throw {
            response: {},
            message: `Contribution to indicator with tocId "${tocId}" not found`,
            status: HttpStatus.NOT_FOUND,
          };
        }
      }

      const lastSubmission =
        contributionToIndicator.contribution_to_indicator_submission_array?.find(
          (submission) => submission.is_active,
        );
      const lastSubmissionStatus = ResultStatusData.getFromValue(
        Number(lastSubmission?.status_id),
      );

      if (!isNew && !lastSubmissionStatus) {
        throw {
          response: {},
          message: `Contribution to indicator with tocId "${tocId}" has no active submissions`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const newStatus: ResultStatusData =
        isNew || lastSubmissionStatus !== ResultStatusData.Editing
          ? ResultStatusData.Editing
          : ResultStatusData.Submitted;

      const newSubmission: ContributionToIndicatorSubmission =
        await this._contributionToIndicatorSubmissionRepository.save({
          user_id: user.id,
          contribution_to_indicator_id: contributionToIndicator.id,
          status_id: newStatus.value,
        });

      if (!isNew) {
        await this._contributionToIndicatorSubmissionRepository.update(
          {
            id: lastSubmission.id,
          },
          {
            is_active: false,
            last_updated_by: user.id,
          },
        );
      }

      return {
        response: contributionToIndicator,
        newSubmission,
        message: `The Contributor to Indicator with tocId ${tocId} has been ${
          newStatus === ResultStatusData.Editing ? 'unsubmitted' : 'submitted'
        }.`,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
