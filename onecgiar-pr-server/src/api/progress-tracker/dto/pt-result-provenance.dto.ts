// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Upstream environments `pt_environment` records (`design.md` §3.1). */
export const PT_PROVENANCE_ENVIRONMENTS = ['dev', 'staging', 'prod'] as const;

/**
 * Upstream `result_key` is `<indicator_id>:<n>` by construction (Guide §4.1;
 * `requirements.md` `PTM-R-3c`). The indicator part is capped at 32 characters so it fits
 * `pt_indicator_id varchar(32)` when the service derives it.
 */
export const PT_RESULT_KEY_PATTERN = /^[^:\s]{1,32}:\d+$/;

/**
 * `PTM-T-7` — optional provenance block on `POST /api/results-framework-reporting/create`
 * (`design.md` §2.3, §12 `PTM-DD-5`; `requirements.md` `PTM-R-13`, `PTM-R-14`;
 * `PTM-AC-12`, `PTM-AC-13`).
 *
 * The `@MaxLength` values mirror the `progress_tracker_result_provenance` column widths
 * (`PTM-T-6` review forward pointer): an over-long upstream value is rejected with a 400
 * before it can reach the `INSERT`, where a non-strict `sql_mode` would truncate it
 * silently.
 *
 * The framework create route has no `ValidationPipe`, and adding one to the whole body
 * would change validation for every existing caller (`PTM-R-14`). These decorators are
 * therefore enforced explicitly by `ProgressTrackerProvenanceService.validate`, only when
 * the block is present.
 *
 * `pt_indicator_id` is deliberately not a field: the client addresses PRMS ids only
 * (`PTM-R-3b`); the service derives it from `result_key`.
 */
export class PtResultProvenanceDto {
  @ApiProperty({
    description: 'Upstream result key, `<indicator_id>:<n>`.',
    maxLength: 64,
    example: '8006329bfd49:1',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(PT_RESULT_KEY_PATTERN)
  result_key: string;

  @ApiPropertyOptional({
    description: 'Upstream `cache.evidence_fingerprint` of the draft.',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  evidence_fingerprint?: string;

  @ApiPropertyOptional({
    description: 'Upstream environment the draft came from.',
    enum: PT_PROVENANCE_ENVIRONMENTS,
    maxLength: 16,
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @IsIn(PT_PROVENANCE_ENVIRONMENTS)
  environment?: string;

  @ApiPropertyOptional({
    description: 'Upstream `generated_by.model` that drafted the proposal.',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  model?: string;

  @ApiPropertyOptional({
    description: 'Upstream `generated_at` (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601()
  generated_at?: string;
}
