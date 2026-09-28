// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProgressTrackerResultProvenance } from './entities/progress-tracker-result-provenance.entity';
import { PtResultProvenanceDto } from './dto/pt-result-provenance.dto';
import { throwServiceError } from '../../shared/utils/service-error.util';

/**
 * `PTM-T-7` — validates and persists the provenance of a result created from a Progress
 * Tracker proposal (`design.md` §2.3, §12 `PTM-DD-5`; `requirements.md` `PTM-R-13`,
 * `PTM-R-14`; `PTM-AC-12`, `PTM-AC-13`).
 *
 * Called by `CreateResultFromFrameworkHandler` in two steps, and only when the payload
 * carries a `progress_tracker_provenance` block — the absent-block guard lives in the
 * handler, so a create without the block never reaches this service:
 *
 * 1. `validate` — **before** the result is created, so a malformed block is a 400 with
 *    no result row behind it.
 * 2. `write` — after associations, before the handler returns (`design.md` §2.3 hook).
 */
@Injectable()
export class ProgressTrackerProvenanceService {
  constructor(
    @InjectRepository(ProgressTrackerResultProvenance)
    private readonly _provenanceRepository: Repository<ProgressTrackerResultProvenance>,
  ) {}

  /**
   * Enforces the DTO decorators the create route itself does not (it has no
   * `ValidationPipe`). Unknown keys are rejected so the block stays a closed shape.
   * The message lists offending property names only, never their values.
   */
  async validate(block: unknown): Promise<PtResultProvenanceDto> {
    // The handler never passes null (it treats null as absent); kept for future callers.
    if (block === null || typeof block !== 'object' || Array.isArray(block)) {
      throwServiceError(
        'progress_tracker_provenance must be an object.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dto = plainToInstance(PtResultProvenanceDto, block);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      const properties = errors.map((e) => e.property).join(', ');
      throwServiceError(
        `Invalid progress_tracker_provenance: ${properties}.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return dto;
  }

  async write(
    resultId: number,
    provenance: PtResultProvenanceDto,
    userId: number,
  ): Promise<ProgressTrackerResultProvenance> {
    return this._provenanceRepository.save(
      this._provenanceRepository.create({
        result_id: resultId,
        pt_result_key: provenance.result_key,
        pt_evidence_fingerprint: provenance.evidence_fingerprint ?? null,
        pt_indicator_id: ProgressTrackerProvenanceService.indicatorIdOf(
          provenance.result_key,
        ),
        pt_environment: provenance.environment ?? null,
        pt_model: provenance.model ?? null,
        pt_generated_at: provenance.generated_at
          ? new Date(provenance.generated_at)
          : null,
        created_by: userId,
        last_updated_by: userId,
      }),
    );
  }

  /** Active provenance rows for one upstream indicator (`PTM-R-13` "queryable by indicator"). */
  findByIndicator(
    ptIndicatorId: string,
  ): Promise<ProgressTrackerResultProvenance[]> {
    return this._provenanceRepository.find({
      where: { pt_indicator_id: ptIndicatorId, is_active: true },
    });
  }

  /** `<indicator_id>:<n>` → `<indicator_id>`; the key's shape is guaranteed by `validate`. */
  static indicatorIdOf(resultKey: string): string {
    return resultKey.slice(0, resultKey.indexOf(':'));
  }
}
