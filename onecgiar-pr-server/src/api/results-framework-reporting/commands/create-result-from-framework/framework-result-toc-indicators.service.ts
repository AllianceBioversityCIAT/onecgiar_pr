import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultsFrameworkTocIndicatorDto } from '../../dto/create-results-framework.dto';
import { AoWBilateralRepository } from '../../../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocTargetIndicatorRepository } from '../../../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { throwReportingFrameworkError } from '../../utils/reporting-framework-error.util';

type IndicatorNumberTargetValue = string | number | null;

@Injectable()
export class FrameworkResultTocIndicatorsService {
  constructor(
    private readonly _tocResultsRepository: AoWBilateralRepository,
    private readonly _resultsTocResultIndicatorsRepository: ResultsTocResultIndicatorsRepository,
    private readonly _resultsIndicatorsTargetsRepository: ResultsTocTargetIndicatorRepository,
  ) {}

  async upsertTocIndicators(
    resultTocResultId: number,
    tocResultId: number,
    indicatorsInput:
      | ResultsFrameworkTocIndicatorDto
      | ResultsFrameworkTocIndicatorDto[]
      | null
      | undefined,
    defaultContributingIndicator: number | null,
    userId: number,
    fallbackNumberTarget?: IndicatorNumberTargetValue,
    fallbackTargetDate?: string | null,
  ): Promise<void> {
    let indicatorsArray: ResultsFrameworkTocIndicatorDto[] = [];
    if (Array.isArray(indicatorsInput)) {
      indicatorsArray = indicatorsInput;
    } else if (indicatorsInput) {
      indicatorsArray = [indicatorsInput];
    }

    if (!indicatorsArray.length) {
      return;
    }

    for (const indicator of indicatorsArray) {
      const indicatorIdRaw =
        (indicator as any)?.indicator_id ?? (indicator as any)?.id;
      const indicatorId = Number(indicatorIdRaw);
      if (!Number.isFinite(indicatorId) || indicatorId <= 0) {
        throwReportingFrameworkError(
          'One of the provided ToC indicator identifiers is invalid.',
        );
      }

      const indicatorRow =
        await this._tocResultsRepository.findIndicatorById(indicatorId);

      if (!indicatorRow) {
        throwReportingFrameworkError(
          `No ToC indicator was found with id '${indicatorId}'.`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (Number(indicatorRow.toc_results_id) !== Number(tocResultId)) {
        throwReportingFrameworkError(
          `The indicator '${indicatorId}' does not belong to the provided ToC result '${tocResultId}'.`,
        );
      }

      const existingIndicator =
        await this._resultsTocResultIndicatorsRepository.findOne({
          where: {
            results_toc_results_id: resultTocResultId,
            toc_results_indicator_id: indicatorRow.related_node_id,
            is_active: true,
          },
        });

      let indicatorRecord =
        existingIndicator ??
        (await this._resultsTocResultIndicatorsRepository.save({
          results_toc_results_id: resultTocResultId,
          toc_results_indicator_id: indicatorRow.related_node_id,
          created_by: userId,
          last_updated_by: userId,
          is_active: true,
        }));

      if (!indicatorRecord?.result_toc_result_indicator_id) {
        indicatorRecord =
          await this._resultsTocResultIndicatorsRepository.findOne({
            where: {
              results_toc_results_id: resultTocResultId,
              toc_results_indicator_id: indicatorRow.related_node_id,
              is_active: true,
            },
          });
      }

      if (!indicatorRecord?.result_toc_result_indicator_id) {
        continue;
      }

      const numberTargetValue = ((indicator as any)?.number_target ??
        fallbackNumberTarget ??
        null) as IndicatorNumberTargetValue;

      const targetDateValue = ((indicator as any)?.target_date ??
        fallbackTargetDate ??
        null) as string | null;

      const contributingValue = ((indicator as any)?.contributing_indicator ??
        defaultContributingIndicator ??
        null) as number | null;

      await this._upsertIndicatorTargetRecord(
        indicatorRecord.result_toc_result_indicator_id,
        numberTargetValue,
        targetDateValue,
        contributingValue,
        userId,
      );
    }
  }

  private async _upsertIndicatorTargetRecord(
    indicatorResultId: number,
    numberTarget: IndicatorNumberTargetValue,
    targetDate: string | null,
    contributingIndicator: number | null,
    userId: number,
  ): Promise<void> {
    const hasNumberTarget =
      numberTarget !== undefined &&
      numberTarget !== null &&
      `${numberTarget}`.trim() !== '';

    if (!hasNumberTarget) {
      return;
    }

    const parsedNumberTarget = Number(numberTarget);

    if (!Number.isFinite(parsedNumberTarget)) {
      throwReportingFrameworkError(
        'The provided number_target value for the indicator contribution is invalid.',
      );
    }

    const parsedContributingIndicator =
      contributingIndicator !== null && contributingIndicator !== undefined
        ? Number(contributingIndicator)
        : null;
    const normalizedContributing =
      parsedContributingIndicator !== null &&
      Number.isFinite(parsedContributingIndicator) &&
      parsedContributingIndicator >= 0
        ? parsedContributingIndicator
        : null;

    const normalizedTargetDate =
      targetDate && targetDate.trim() !== '' ? targetDate.trim() : null;
    const parsedTargetDate =
      normalizedTargetDate === null ? null : Number(normalizedTargetDate);
    const numericTargetDate =
      parsedTargetDate === null || !Number.isFinite(parsedTargetDate)
        ? null
        : parsedTargetDate;

    const existingTarget =
      await this._resultsIndicatorsTargetsRepository.findOne({
        where: {
          result_toc_result_indicator_id: indicatorResultId,
          number_target: parsedNumberTarget,
          is_active: true,
        },
      });

    if (existingTarget) {
      await this._resultsIndicatorsTargetsRepository.update(
        existingTarget.indicators_targets,
        {
          contributing_indicator: normalizedContributing,
          target_date: numericTargetDate,
          last_updated_by: userId,
          is_active: true,
        },
      );
      return;
    }

    await this._resultsIndicatorsTargetsRepository.save({
      result_toc_result_indicator_id: indicatorResultId,
      number_target: parsedNumberTarget,
      contributing_indicator: normalizedContributing,
      target_date: numericTargetDate,
      created_by: userId,
      last_updated_by: userId,
      is_active: true,
    });
  }
}
