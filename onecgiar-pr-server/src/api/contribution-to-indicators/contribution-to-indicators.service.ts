import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicatorsRepository } from './repositories/contribution-to-indicators.repository';
import { ContributionToIndicatorResultsRepository } from './repositories/contribution-to-indicator-result.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ContributionToIndicatorsDto } from './dto/contribution-to-indicators.dto';
import { ContributionToIndicatorResult } from './entities/contribution-to-indicator-result.entity';
import { ContributionToIndicator } from './entities/contribution-to-indicator.entity';
import { ContributionToIndicatorResultsDto } from './dto/contribution-to-indicator-results.dto';

@Injectable()
export class ContributionToIndicatorsService {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorsService.name,
  );
  constructor(
    private readonly _contributionToIndicatorsRepository: ContributionToIndicatorsRepository,
    private readonly _contributionToIndicatorResultsRepository: ContributionToIndicatorResultsRepository,
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
        data,
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

      return {
        contribution,
        message: `The Contributor to Indicator to tocId ${tocId} has been created.`,
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneCoIResultByTocId(tocId: string) {
    try {
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

      contributionToIndicator.contributing_results =
        await this._contributionToIndicatorResultsRepository.findResultContributionsByTocId(
          tocId,
        );

      return {
        contributionToIndicator,
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
        contributionToIndicator,
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
      processedContributingResults: ContributionToIndicatorResult[] = [],
    ): ContributionToIndicatorResult[] {
      for (const result of contributingResults) {
        let contributingResult: ContributionToIndicatorResult = null;
        if (!result.contribution_id) {
          contributingResult =
            this._contributionToIndicatorResultsRepository.create({
              created_by: userDto.id,
              contribution_to_indicator_id:
                contributionToIndicatorDto.contribution_id,
              result_id: result.result_id,
              is_active: result.is_active ?? true,
            });
        } else {
          contributingResult =
            contributionToIndicator.contribution_to_indicator_result_array.find(
              (ctir) => ctir.id === result.contribution_id,
            );
        }

        if (!contributingResult) {
          throw {
            response: {},
            message: `Contribution to indicator result with id "${result.contribution_id}" not found`,
            status: HttpStatus.NOT_FOUND,
          };
        }

        if (result.is_active) {
          contributingResult.is_active = true;
        }
        contributingResult.last_updated_by = userDto.id;

        processedContributingResults.push(contributingResult);

        if (result.linked_results) {
          processedContributingResults.push(
            ...recursive(result.linked_results, processedContributingResults),
          );
        }

        return processedContributingResults;
      }
    }

    const contributingResultArray: ContributionToIndicatorResult[] = recursive(
      contributionToIndicatorDto.contributing_results,
    );

    await this._contributionToIndicatorResultsRepository.save(
      contributingResultArray,
    );
  }

  remove(id: number) {
    return `This action removes a #${id} contributionToIndicator`;
  }
}
