import { HttpStatus, Injectable } from '@nestjs/common';
import { GetExistingResultContributorsToIndicatorsQuery } from './get-existing-result-contributors.query';
import { ExistingResultContributorsLoaderService } from './existing-result-contributors-loader.service';
import { ContributorsRoleResolverService } from './contributors-role-resolver.service';
import { mapContributorRecords } from './existing-result-contributors.mapper';

@Injectable()
export class GetExistingResultContributorsToIndicatorsHandler {
  constructor(
    private readonly _existingResultContributorsLoaderService: ExistingResultContributorsLoaderService,
    private readonly _contributorsRoleResolverService: ContributorsRoleResolverService,
  ) {}

  async execute(query: GetExistingResultContributorsToIndicatorsQuery) {
    const parsedResultTocResultId =
      this._existingResultContributorsLoaderService.parseResultTocResultId(
        query.resultTocResultId,
      );
    const tocResultIndicatorId =
      this._existingResultContributorsLoaderService.validateTocResultIndicatorId(
        query.tocResultIndicatorId,
      );

    const resultContributionExists =
      await this._existingResultContributorsLoaderService.loadContributions(
        parsedResultTocResultId,
        tocResultIndicatorId,
      );

    const filteredContributors =
      await this._existingResultContributorsLoaderService.filterContributorsWithIndicator(
        resultContributionExists,
        tocResultIndicatorId,
      );

    if (!filteredContributors) {
      return {
        response: {
          contributors: [],
          resultTocResultId: parsedResultTocResultId,
          tocResultIndicatorId,
        },
        message: 'No contributions found for the specified indicator.',
        status: HttpStatus.OK,
      };
    }

    const uniqueResultIds = Array.from(
      new Set(
        filteredContributors
          .map((contrib) => Number(contrib.result_id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const { rolesByResult, userGeneralRole } =
      await this._contributorsRoleResolverService.resolve(
        query.user,
        uniqueResultIds,
      );

    const contributors = mapContributorRecords(
      filteredContributors,
      rolesByResult,
      userGeneralRole,
      tocResultIndicatorId,
    );

    return {
      response: {
        contributors,
        resultTocResultId: parsedResultTocResultId,
        tocResultIndicatorId,
      },
      message: 'Existing result contributors retrieved successfully.',
      status: HttpStatus.OK,
    };
  }
}
