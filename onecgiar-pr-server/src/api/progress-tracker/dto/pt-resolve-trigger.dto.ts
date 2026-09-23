// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * `PTM-T-5` — body DTO for `POST /api/progress-tracker/indicator-map/resolve`
 * (`design.md` §4.1 "fill trigger"; `requirements.md` `PTM-R-10`, `PTM-R-30`).
 *
 * Both fields are optional: an empty body resolves the whole active reporting
 * version, matching `design.md` §4.1 ("defaults to the active reporting version").
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
}
