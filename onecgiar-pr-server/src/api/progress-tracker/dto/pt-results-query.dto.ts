// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Drafting modes the upstream documents (Guide §4.1). */
export const PT_RESULTS_MODES = ['auto', 'template'] as const;
export type PtResultsMode = (typeof PT_RESULTS_MODES)[number];

/**
 * `PTM-T-4` — whitelist query DTO for
 * `GET /api/progress-tracker/indicators/:tocIndicatorId/results`
 * (`design.md` §4.1; `requirements.md` `PTM-R-6`; `PTM-AC-8`).
 *
 * Bound in the controller with
 * `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` —
 * a query param that is not a declared property of this class is rejected with 400
 * before it can reach the upstream (`PTM-R-6`, `PTM-AC-8`).
 */
export class PtResultsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of proposals the upstream returns',
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  max_results?: number = 5;

  @ApiPropertyOptional({
    description: 'Force the upstream to bypass its cache and redraft',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  refresh?: boolean;

  @ApiPropertyOptional({
    description: 'Drafting mode',
    enum: PT_RESULTS_MODES,
  })
  @IsOptional()
  @IsIn(PT_RESULTS_MODES)
  mode?: PtResultsMode;
}
