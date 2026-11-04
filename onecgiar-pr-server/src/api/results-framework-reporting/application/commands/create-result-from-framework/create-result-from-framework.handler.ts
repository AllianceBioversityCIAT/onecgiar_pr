import { HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { ResultRepository } from '../../../../results/result.repository';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { throwServiceError } from '../../../../../shared/utils/service-error.util';
import { ProgressTrackerProvenanceService } from '../../../../progress-tracker/progress-tracker-provenance.service';
import { PtResultProvenanceDto } from '../../../../progress-tracker/dto/pt-result-provenance.dto';
import { ProgressTrackerPrefillService } from '../../../../progress-tracker/progress-tracker-prefill.service';
import { PtPrefillSummary } from '../../../../progress-tracker/dto/pt-result-prefill.dto';
import { ResultTypeEnum } from '../../../../../shared/constants/result-type.enum';
import { ResultLevelEnum } from '../../../../../shared/constants/result-level.enum';
import { CreateResultsFrameworkResultDto } from '../../../dto/create-results-framework.dto';
import {
  IMPACT_AREA_TAG_COLUMN,
  IMPACT_TAG_LEVEL_NOT_TARGETED,
  IMPACT_TAG_LEVEL_PRINCIPAL,
  ImpactAreaId,
} from '../../../impact-level/constants/impact-area-tag-column';

@Injectable()
export class CreateResultFromFrameworkHandler {
  private readonly logger = new Logger(CreateResultFromFrameworkHandler.name);

  constructor(
    private readonly _createFrameworkResultEntityService: CreateFrameworkResultEntityService,
    private readonly _linkFrameworkResultTocService: LinkFrameworkResultTocService,
    private readonly _applyFrameworkResultAssociationsService: ApplyFrameworkResultAssociationsService,
    private readonly _resultRepository: ResultRepository,
    // `@Optional()` so the handler still resolves where it is built without it (the
    // pre-existing handler/service specs, `PTM-AC-13`); a create that carries provenance
    // fails loudly below instead of silently skipping the write.
    @Optional()
    private readonly _progressTrackerProvenanceService?: ProgressTrackerProvenanceService,
    // `PTB-R-18a`: optional for the same reason; best-effort, so its absence only logs.
    @Optional()
    private readonly _progressTrackerPrefillService?: ProgressTrackerPrefillService,
  ) {}

  async execute(command: CreateResultFromFrameworkCommand) {
    const { payload, user } = command;

    // IRS-R-1 (E1): impact results are guarded manually, before any write.
    const impactAreaId = this._isImpactCreate(payload)
      ? this._assertImpactCreatePayload(payload)
      : null;

    // PTM-T-7 (`PTM-R-14`, `PTM-AC-13`): no block, no provenance step at all.
    const hasProvenance = payload.progress_tracker_provenance != null;
    let provenance: PtResultProvenanceDto;
    if (hasProvenance) {
      if (!this._progressTrackerProvenanceService) {
        throwServiceError(
          'Progress Tracker provenance cannot be stored.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      provenance = await this._progressTrackerProvenanceService.validate(
        payload.progress_tracker_provenance,
      );
    }

    const { createdResultId, knowledgeProductResponse, initiativeId } =
      await this._createFrameworkResultEntityService.execute(payload, user);

    const resultSummary =
      await this._resultRepository.getResultById(createdResultId);

    if (!resultSummary) {
      throwServiceError(
        'The result could not be retrieved after creation.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // IRS-R-1 / IRS-R-2: impact results carry no ToC link; the Impact Area prefill runs
    // once here (never in createResultGeneralInformation, so later saves are untouched).
    let primaryTocRecordId: number | null = null;
    if (impactAreaId === null) {
      primaryTocRecordId = await this._linkFrameworkResultTocService.execute(
        payload,
        user,
        createdResultId,
        initiativeId,
      );
    } else {
      await this._applyImpactAreaPrefill(
        impactAreaId,
        createdResultId,
        user.id,
      );
    }

    await this._applyFrameworkResultAssociationsService.execute(
      payload,
      user,
      createdResultId,
    );

    // PTM-T-7 hook (`design.md` §2.3): after associations, before the return.
    if (hasProvenance) {
      await this._progressTrackerProvenanceService.write(
        createdResultId,
        provenance,
        user.id,
      );
    }

    // `PTB-R-18a` / `PTB-R-18b`: evidence links, matched partners, geography and impact-area
    // scores of the same pick. Only with provenance (a
    // real PT pick), after it is written, and never able to fail the create — the service
    // swallows and logs its own failures.
    let progressTrackerPrefill: PtPrefillSummary | undefined;
    if (hasProvenance && payload.progress_tracker_prefill != null) {
      if (this._progressTrackerPrefillService) {
        progressTrackerPrefill =
          await this._progressTrackerPrefillService.apply(
            createdResultId,
            payload.progress_tracker_prefill,
            user.id,
            Number(payload.result?.result_type_id) ===
              ResultTypeEnum.KNOWLEDGE_PRODUCT,
          );
      } else {
        this.logger.warn(
          `pt.prefill.unavailable result=${createdResultId}: prefill service not provided`,
        );
      }
    }

    return {
      response: {
        result: resultSummary,
        knowledgeProduct: knowledgeProductResponse ?? null,
        tocResultLinkId: primaryTocRecordId,
        ...(progressTrackerPrefill ? { progressTrackerPrefill } : {}),
      },
      message: 'Result created successfully through the reporting workflow.',
      status: HttpStatus.CREATED,
    };
  }

  private _isImpactCreate(payload: CreateResultsFrameworkResultDto): boolean {
    return (
      Number(payload?.result?.result_level_id) === ResultLevelEnum.IMPACT &&
      Number(payload?.result?.result_type_id) ===
        ResultTypeEnum.IMPACT_CONTRIBUTION
    );
  }

  /** Returns the validated Impact Area id, or throws 400 (IRS-R-1, Scenarios 1.2 / 1.3). */
  private _assertImpactCreatePayload(
    payload: CreateResultsFrameworkResultDto,
  ): ImpactAreaId {
    const raw: unknown = payload.result.impact_area_id;
    const isNumeric =
      typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '');
    const area = isNumeric ? Number(raw) : Number.NaN;
    if (!Number.isInteger(area) || !(area in IMPACT_AREA_TAG_COLUMN)) {
      throwServiceError('Impact results require an Impact Area');
    }

    const forbidden = (
      [
        ['toc_result_id', payload.toc_result_id],
        ['indicators', payload.indicators],
        ['number_target', payload.number_target],
        ['target_date', payload.target_date],
        ['contributing_indicator', payload.contributing_indicator],
        // Post-decision 2026-10-30 (R-9): a non-empty ToC contributors list is forbidden;
        // the client may still send an empty list.
        [
          'contributors_result_toc_result',
          Array.isArray(payload.contributors_result_toc_result) &&
          payload.contributors_result_toc_result.length > 0
            ? payload.contributors_result_toc_result
            : null,
        ],
      ] as const
    )
      .filter(([, value]) => value != null)
      .map(([field]) => field);
    if (forbidden.length) {
      throwServiceError(
        'Impact results cannot have targets, indicators or Theory of Change',
        HttpStatus.BAD_REQUEST,
        { forbidden_fields: forbidden },
      );
    }

    return area as ImpactAreaId;
  }

  private async _applyImpactAreaPrefill(
    impactAreaId: ImpactAreaId,
    resultId: number,
    userId: number,
  ): Promise<void> {
    const chosen = IMPACT_AREA_TAG_COLUMN[impactAreaId];
    const patch: Record<string, number> = {};
    for (const column of Object.values(IMPACT_AREA_TAG_COLUMN)) {
      patch[column] =
        column === chosen
          ? IMPACT_TAG_LEVEL_PRINCIPAL
          : IMPACT_TAG_LEVEL_NOT_TARGETED;
    }
    await this._resultRepository.update(resultId, {
      ...patch,
      last_updated_by: userId,
    });
  }
}
