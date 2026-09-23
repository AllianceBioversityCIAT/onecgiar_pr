import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { ResultRepository } from '../../../../results/result.repository';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { throwServiceError } from '../../../../../shared/utils/service-error.util';
import { ProgressTrackerProvenanceService } from '../../../../progress-tracker/progress-tracker-provenance.service';
import { PtResultProvenanceDto } from '../../../../progress-tracker/dto/pt-result-provenance.dto';

@Injectable()
export class CreateResultFromFrameworkHandler {
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
  ) {}

  async execute(command: CreateResultFromFrameworkCommand) {
    const { payload, user } = command;

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

    const primaryTocRecordId =
      await this._linkFrameworkResultTocService.execute(
        payload,
        user,
        createdResultId,
        initiativeId,
      );

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

    return {
      response: {
        result: resultSummary,
        knowledgeProduct: knowledgeProductResponse ?? null,
        tocResultLinkId: primaryTocRecordId,
      },
      message: 'Result created successfully through the reporting workflow.',
      status: HttpStatus.CREATED,
    };
  }
}
