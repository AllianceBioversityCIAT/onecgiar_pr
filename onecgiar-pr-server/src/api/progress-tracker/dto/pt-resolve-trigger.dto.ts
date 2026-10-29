// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Upstream calls per batch: ~1–1.5 s each keeps a batch well inside the 29 s gateway window. */
export const PT_RESOLVE_LIMIT_DEFAULT = 15;
export const PT_RESOLVE_LIMIT_MAX = 50;

/**
 * `PTM-T-5` — body DTO for `POST /api/progress-tracker/indicator-map/resolve`
 * (`design.md` §4.1 "fill trigger"; `requirements.md` `PTM-R-10`, `PTM-R-30`).
 *
 * Every field is optional: an empty body resolves the first batch of the active
 * reporting version, matching `design.md` §4.1 ("defaults to the active reporting
 * version").
 *
 * Batching: one call makes at most `limit` upstream `/resolve` calls, starting at
 * `cursor`, and answers the `next_cursor` to send back (`null` once the list is done) —
 * a whole version does not fit in the 29 s API Gateway window. Rows already in the map
 * are skipped without an upstream call unless `force` is true.
 */
export class PtResolveTriggerDto {
  @ApiPropertyOptional({
    description:
      'Reporting version id to resolve. Defaults to the active reporting version.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionId?: number;

  @ApiPropertyOptional({
    description:
      'PRMS program identifier (name or official code) to narrow the fill to one program. Forwarded unchanged, never translated to a Progress Tracker id (`design.md` §4.1 `:programId` note).',
  })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional({
    description:
      'Maximum upstream /resolve calls in this batch (rows already mapped do not count).',
    minimum: 1,
    maximum: PT_RESOLVE_LIMIT_MAX,
    default: PT_RESOLVE_LIMIT_DEFAULT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PT_RESOLVE_LIMIT_MAX)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Position in the ordered ToC indicator rows to resume from — the `next_cursor` of the previous batch.',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number;

  @ApiPropertyOptional({
    description: 'Re-resolve rows that already have a mapping row.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  force?: boolean;
}
