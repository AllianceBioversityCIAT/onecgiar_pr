// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * `PTM-T-4` — whitelist query DTO for
 * `GET /api/progress-tracker/programs/:programId/ready-counts`
 * (`design.md` §4.1; `requirements.md` `PTM-R-6`; `PTM-AC-8`).
 *
 * Bound in the controller with
 * `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` —
 * a query param that is not a declared property of this class is rejected with 400
 * before it can reach the upstream (`PTM-R-6`, `PTM-AC-8`).
 */
export class PtReadyCountsQueryDto {
  @ApiPropertyOptional({
    description:
      'Only include indicators with at least this many evidence items',
    minimum: 0,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_evidence?: number = 1;
}
