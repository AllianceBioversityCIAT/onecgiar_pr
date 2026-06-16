import { HttpStatus, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { ResultsTocResultRepository } from '../../../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultStatusData } from '../../../../../shared/constants/result-status.enum';
import { throwReportingFrameworkError } from '../../utils/reporting-framework-error.util';
import type { ExistingResultContributorRecord } from './existing-result-contributors.types';

@Injectable()
export class ExistingResultContributorsLoaderService {
  constructor(
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultsTocResultIndicatorsRepository: ResultsTocResultIndicatorsRepository,
  ) {}

  parseResultTocResultId(resultTocResultId: string | number): number {
    const parsedResultTocResultId = Number(resultTocResultId);
    if (
      !Number.isFinite(parsedResultTocResultId) ||
      parsedResultTocResultId <= 0
    ) {
      throwReportingFrameworkError('Invalid resultTocResultId provided.');
    }
    return parsedResultTocResultId;
  }

  validateTocResultIndicatorId(tocResultIndicatorId: string): string {
    if (!tocResultIndicatorId || `${tocResultIndicatorId}`.trim() === '') {
      throwReportingFrameworkError('Invalid tocResultIndicatorId provided.');
    }
    return tocResultIndicatorId;
  }

  async loadContributions(
    parsedResultTocResultId: number,
    tocResultIndicatorId: string,
  ): Promise<ExistingResultContributorRecord[]> {
    const resultContributionExists =
      await this._resultsTocResultRepository.find({
        relations: {
          obj_results: {
            obj_status: true,
          },
          obj_results_toc_result_indicators: {
            obj_result_indicator_targets: true,
          },
        },
        where: {
          toc_result_id: parsedResultTocResultId,
          is_active: true,
          obj_results: {
            is_active: true,
            status_id: In([
              ResultStatusData.QualityAssessed.value,
              ResultStatusData.Approved.value,
            ]),
          },
          obj_results_toc_result_indicators: {
            toc_results_indicator_id: tocResultIndicatorId,
            is_active: true,
            is_not_aplicable: false,
            obj_result_indicator_targets: {
              is_active: true,
            },
          },
        },
        select: {
          result_toc_result_id: true,
          result_id: true,
          toc_result_id: true,
          obj_results: {
            title: true,
            result_code: true,
            result_type_id: true,
            version_id: true,
            status_id: true,
            obj_status: {
              result_status_id: true,
              status_name: true,
              status_description: true,
            },
          },
          obj_results_toc_result_indicators: {
            toc_results_indicator_id: true,
            obj_result_indicator_targets: {
              number_target: true,
              target_date: true,
              contributing_indicator: true,
              is_active: true,
            },
          },
        },
      });

    if (!resultContributionExists?.length) {
      throwReportingFrameworkError(
        'No result contribution record was found with the provided resultTocResultId.',
        HttpStatus.NOT_FOUND,
      );
    }

    return resultContributionExists as ExistingResultContributorRecord[];
  }

  async filterContributorsWithIndicator(
    resultContributionExists: ExistingResultContributorRecord[],
    tocResultIndicatorId: string,
  ): Promise<ExistingResultContributorRecord[] | null> {
    const tocResultIdsWithIndicator = resultContributionExists.map(
      (contrib) => contrib.result_toc_result_id,
    );

    const indicatorsForResults =
      await this._resultsTocResultIndicatorsRepository.find({
        where: {
          results_toc_results_id: In(tocResultIdsWithIndicator),
          toc_results_indicator_id: tocResultIndicatorId,
          is_active: true,
          is_not_aplicable: false,
        },
        select: ['results_toc_results_id'],
      });

    if (!indicatorsForResults?.length) {
      return null;
    }

    const contributingTocResultIds = new Set(
      indicatorsForResults.map((ind) => ind.results_toc_results_id),
    );

    return resultContributionExists.filter((contrib) =>
      contributingTocResultIds.has(contrib.result_toc_result_id),
    );
  }
}
