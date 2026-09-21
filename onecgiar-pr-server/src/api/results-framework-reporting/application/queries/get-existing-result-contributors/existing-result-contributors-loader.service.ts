import { HttpStatus, Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { ResultsTocResultRepository } from '../../../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultStatusData } from '../../../../../shared/constants/result-status.enum';
import type {
  ExistingResultContributorRecord,
  ExistingResultContributorsScope,
} from './existing-result-contributors.types';
import { throwServiceError } from '../../../../../shared/utils/service-error.util';

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
      throwServiceError('Invalid resultTocResultId provided.');
    }
    return parsedResultTocResultId;
  }

  validateTocResultIndicatorId(tocResultIndicatorId: string): string {
    if (!tocResultIndicatorId || `${tocResultIndicatorId}`.trim() === '') {
      throwServiceError('Invalid tocResultIndicatorId provided.');
    }
    return tocResultIndicatorId;
  }

  // @akili-spec changes/indicator-reported-results — status set built from ResultStatusData members, never numeric literals (IRR-DD-2)
  private static readonly REVIEWED_SCOPE_STATUS_IDS = [
    ResultStatusData.QualityAssessed.value,
    ResultStatusData.Approved.value,
  ];

  // @akili-spec changes/indicator-reported-results — Discontinued (4), Rejected (7) and Draft (8) stay out (assumption A-2)
  private static readonly ALL_SCOPE_STATUS_IDS = [
    ResultStatusData.Editing.value,
    ResultStatusData.QualityAssessed.value,
    ResultStatusData.Submitted.value,
    ResultStatusData.PendingReview.value,
    ResultStatusData.Approved.value,
  ];

  // @akili-spec bugfix/reported-results-center-scoping — invalid/non-numeric
  // values are treated as absent, same defensive posture as RRC-DD-4's write-side
  // sibling (number_target/target_date), never a hard validation error here.
  private parseTocIndicatorTargetId(
    tocIndicatorTargetId?: string | number,
  ): number | undefined {
    if (tocIndicatorTargetId === undefined || tocIndicatorTargetId === null) {
      return undefined;
    }
    // Express yields '' for a bare `?tocIndicatorTargetId=`, and Number('') is
    // 0 — a blank string must be treated as absent, not as a live
    // `toc_indicator_target_id = 0` filter (same defensive posture as the
    // write-path's target_date handling).
    if (
      typeof tocIndicatorTargetId === 'string' &&
      tocIndicatorTargetId.trim() === ''
    ) {
      return undefined;
    }
    const parsed = Number(tocIndicatorTargetId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async loadContributions(
    parsedResultTocResultId: number,
    tocResultIndicatorId: string,
    // @akili-spec changes/indicator-reported-results
    scope: ExistingResultContributorsScope = 'reviewed',
    // @akili-spec bugfix/reported-results-center-scoping (RRC-R-3, RRC-DD-4)
    tocIndicatorTargetId?: string | number,
  ): Promise<ExistingResultContributorRecord[]> {
    const statusIds =
      scope === 'all'
        ? ExistingResultContributorsLoaderService.ALL_SCOPE_STATUS_IDS
        : ExistingResultContributorsLoaderService.REVIEWED_SCOPE_STATUS_IDS;

    const parsedTocIndicatorTargetId =
      this.parseTocIndicatorTargetId(tocIndicatorTargetId);

    // @akili-spec bugfix/reported-results-center-scoping (RRC-R-3, RRC-DD-4)
    // Only narrow by the exact combination-group anchor when the caller supplies
    // one; a NULL-safe fallback (OR toc_indicator_target_id IS NULL) keeps a
    // pre-fix row surfacing exactly as it does today (RRC-R-8/RRC-AC-6). When
    // the caller supplies nothing at all, behavior is unchanged (coarse-only).
    const buildWhere = (
      targetIdCondition?: number | ReturnType<typeof IsNull>,
    ) => ({
      toc_result_id: parsedResultTocResultId,
      is_active: true,
      obj_results: {
        is_active: true,
        status_id: In(statusIds),
      },
      obj_results_toc_result_indicators: {
        toc_results_indicator_id: tocResultIndicatorId,
        is_active: true,
        is_not_aplicable: false,
        obj_result_indicator_targets: {
          is_active: true,
          ...(targetIdCondition !== undefined
            ? { toc_indicator_target_id: targetIdCondition }
            : {}),
        },
      },
    });

    const where =
      parsedTocIndicatorTargetId !== undefined
        ? [buildWhere(parsedTocIndicatorTargetId), buildWhere(IsNull())]
        : buildWhere();

    const resultContributionExists =
      await this._resultsTocResultRepository.find({
        relations: {
          obj_results: {
            obj_status: true,
            // @akili-spec changes/indicator-reported-results
            obj_result_type: true,
          },
          obj_results_toc_result_indicators: {
            obj_result_indicator_targets: true,
          },
        },
        where,
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
            // @akili-spec changes/indicator-reported-results
            obj_result_type: {
              id: true,
              name: true,
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
      throwServiceError(
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
