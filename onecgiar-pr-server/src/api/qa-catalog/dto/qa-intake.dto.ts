// @akili-spec quality-assurance/qa-intake
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { QA_INTAKE_BATCH_MAX } from '../qa-intake.constants';
import {
  QA_RESULTS_PHASE_YEAR_MAX,
  QA_RESULTS_PHASE_YEAR_MIN,
  QA_RESULTS_RESULT_ID_MAX,
} from '../qa-results.constants';

/**
 * QIN-R-2: body of `POST /api/qa/results/intake`. Same limits as the feed's `details` body (QIN-DD-10). The batch is
 * bounded as SENT; a repeated id is NOT an error - the service collapses it, keeping the order of first appearance.
 * Validated with `forbidNonWhitelisted`: an unknown key (for example a `platform_id`) is a 400, never silently dropped.
 */
export class QaIntakeDto {
  @ApiProperty({ example: 2026, description: 'Phase year (required)' })
  @IsInt()
  @Min(QA_RESULTS_PHASE_YEAR_MIN)
  @Max(QA_RESULTS_PHASE_YEAR_MAX)
  phase_year: number;

  @ApiProperty({
    example: [31084, 31085],
    description: `Result ids to take into QA, 1..${QA_INTAKE_BATCH_MAX} positive integers; duplicates are collapsed (first appearance wins)`,
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(QA_INTAKE_BATCH_MAX)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(QA_RESULTS_RESULT_ID_MAX, { each: true })
  result_ids: number[];
}
