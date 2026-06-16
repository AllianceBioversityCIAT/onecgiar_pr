import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsFrameworkResultDto } from '../../dto/create-results-framework.dto';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { AoWBilateralRepository } from '../../../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultsTocResultRepository } from '../../../results/results-toc-results/repositories/results-toc-results.repository';
import { ReportingTocContextService } from '../../reporting-toc-context/reporting-toc-context.service';
import { FrameworkResultTocIndicatorsService } from './framework-result-toc-indicators.service';
import { throwReportingFrameworkError } from '../../utils/reporting-framework-error.util';

const TOC_CATEGORY_LEVEL_MAP: Record<string, number> = {
  OUTPUT: 1,
  OUTCOME: 2,
  EOI: 3,
};

@Injectable()
export class LinkFrameworkResultTocService {
  constructor(
    private readonly _reportingTocContextService: ReportingTocContextService,
    private readonly _tocResultsRepository: AoWBilateralRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _frameworkResultTocIndicatorsService: FrameworkResultTocIndicatorsService,
  ) {}

  async execute(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
    initiativeId: number,
  ): Promise<number | null> {
    if (payload.toc_result_id === undefined) {
      return null;
    }

    const resolvedTocResultId = Number(payload.toc_result_id);

    if (!Number.isFinite(resolvedTocResultId) || resolvedTocResultId <= 0) {
      throwReportingFrameworkError(
        'The provided ToC result identifier is invalid.',
      );
    }

    const tocContext = await this._reportingTocContextService.resolve();
    const tocResult = await this._tocResultsRepository.findResultById(
      resolvedTocResultId,
      tocContext.phaseUuid,
    );

    if (!tocResult) {
      throwReportingFrameworkError(
        'No ToC result was found with the provided identifier in the Integration catalogue.',
        HttpStatus.NOT_FOUND,
      );
    }

    const normalizedCategory = `${tocResult?.category ?? ''}`
      .trim()
      .toUpperCase();
    const resolvedTocLevelId = TOC_CATEGORY_LEVEL_MAP[normalizedCategory];

    if (!resolvedTocLevelId) {
      throwReportingFrameworkError(
        'The ToC result category is not supported for automatic level mapping.',
      );
    }

    const primaryTocRecordId = await this._upsertPrimaryTocRecord(
      payload,
      user,
      createdResultId,
      initiativeId,
      resolvedTocResultId,
      resolvedTocLevelId,
    );

    if (payload.indicators) {
      await this._frameworkResultTocIndicatorsService.upsertTocIndicators(
        primaryTocRecordId,
        resolvedTocResultId,
        payload.indicators,
        payload.contributing_indicator ?? null,
        user.id,
        payload.number_target ?? null,
        payload.target_date ?? null,
      );
    }

    return primaryTocRecordId;
  }

  private async _upsertPrimaryTocRecord(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
    createdResultId: number,
    initiativeId: number,
    resolvedTocResultId: number,
    resolvedTocLevelId: number,
  ): Promise<number> {
    let primaryTocRecord = await this._resultsTocResultRepository.findOne({
      where: {
        result_id: createdResultId,
        initiative_ids: initiativeId,
        is_active: true,
      },
    });

    if (primaryTocRecord) {
      await this._resultsTocResultRepository.update(
        primaryTocRecord.result_toc_result_id,
        {
          toc_result_id: resolvedTocResultId,
          toc_level_id: resolvedTocLevelId,
          toc_progressive_narrative: payload.toc_progressive_narrative ?? null,
          last_updated_by: user.id,
          is_active: true,
          planned_result: true,
          initiative_ids: initiativeId,
        },
      );
    } else {
      primaryTocRecord = await this._resultsTocResultRepository.save({
        initiative_ids: initiativeId,
        toc_result_id: resolvedTocResultId,
        toc_level_id: resolvedTocLevelId,
        result_id: createdResultId,
        planned_result: true,
        toc_progressive_narrative: payload.toc_progressive_narrative ?? null,
        created_by: user.id,
        last_updated_by: user.id,
        is_active: true,
      });
    }

    return primaryTocRecord.result_toc_result_id;
  }
}
