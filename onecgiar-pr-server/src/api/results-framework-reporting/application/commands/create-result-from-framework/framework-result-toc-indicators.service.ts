import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultsFrameworkTocIndicatorDto } from '../../../dto/create-results-framework.dto';
import { AoWBilateralRepository } from '../../../../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocTargetIndicatorRepository } from '../../../../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { throwServiceError } from '../../../../../shared/utils/service-error.util';

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
        throwServiceError(
          'One of the provided ToC indicator identifiers is invalid.',
        );
      }

      const indicatorRow =
        await this._tocResultsRepository.findIndicatorById(indicatorId);

      if (!indicatorRow) {
        throwServiceError(
          `No ToC indicator was found with id '${indicatorId}'.`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (Number(indicatorRow.toc_results_id) !== Number(tocResultId)) {
        throwServiceError(
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

    /**
     * P2-3668 — the gate used to be `if (!hasNumberTarget) return;`, which threw away the whole row
     * whenever the ToC indicator carried no target of its own. The contribution the reporter typed
     * in the creation modal went with it: saved with no error, and the field came back showing its
     * placeholder in Contributors and partners.
     *
     * Measured on prtest before the change: of the 13 most recent 2026 results, 7 stored no
     * contribution — and in every one of those 7 the indicator target was empty too, which is the
     * same gate seen from the data side. On result 9166, created by QA through this very modal with
     * a contribution of 1, `GET /v2/api/contributors-partners/9166` returned the target record
     * entirely null: the row had never been written.
     *
     * The target and the contribution are two different facts. A ToC node with no numeric target
     * does not make the reporter's contribution meaningless, so the row is now written whenever
     * EITHER is present. Nothing changes for the callers that already carry a target.
     */
    if (!hasNumberTarget && normalizedContributing === null) {
      return;
    }

    /**
     * 0, not null: `number_target` is NOT NULL in the database (verified against the test schema on
     * 11 Sep 2026), and 0 is already what the platform stores for an indicator with no target of
     * its own — `results-toc-results.repository.ts:1813-1816` resolves it as
     * `canonical ?? typed ?? 0` on the Contributors and partners save path. 234 rows carry it
     * today, 79 of them alongside a contribution, so this writes the shape that already exists
     * rather than inventing a second one.
     */
    const parsedNumberTarget = hasNumberTarget ? Number(numberTarget) : 0;

    if (!Number.isFinite(parsedNumberTarget)) {
      throwServiceError(
        'The provided number_target value for the indicator contribution is invalid.',
      );
    }

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
