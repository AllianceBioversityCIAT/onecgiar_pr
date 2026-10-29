// @akili-spec quality-assurance/qa-intake
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { QA_INTAKE_BATCH_MAX } from '../qa-intake.constants';
import {
  QA_RESULTS_PHASE_YEAR_MAX,
  QA_RESULTS_PHASE_YEAR_MIN,
  QA_RESULTS_RESULT_ID_MAX,
} from '../qa-results.constants';
import { QaReleaseOutcome } from './qa-intake-response.dto';

export const QA_RELEASE_OUTCOMES: readonly QaReleaseOutcome[] = [
  'qaed',
  'not_qaed',
];

/** One entry of the release batch (QIN-R-2): the result and how QA ends its review. */
export class QaReleaseItemDto {
  @ApiProperty({ example: 31084 })
  @IsInt()
  @Min(1)
  @Max(QA_RESULTS_RESULT_ID_MAX)
  result_id: number;

  @ApiProperty({
    enum: QA_RELEASE_OUTCOMES,
    example: 'qaed',
    description:
      '`qaed` -> Quality Assessed; `not_qaed` -> back to the program, still Submitted',
  })
  @IsIn(QA_RELEASE_OUTCOMES)
  outcome: QaReleaseOutcome;
}

/**
 * QIN-R-2: body of `POST /api/qa/results/release`. The service neither caps nor dedupes the batch, so this DTO is the only
 * gate: 1..50 items as SENT, unique by `result_id` (a repeat is a 400, not a collapse), and unknown keys are a 400 too.
 */
export class QaReleaseDto {
  @ApiProperty({ example: 2026, description: 'Phase year (required)' })
  @IsInt()
  @Min(QA_RESULTS_PHASE_YEAR_MIN)
  @Max(QA_RESULTS_PHASE_YEAR_MAX)
  phase_year: number;

  @ApiProperty({
    type: [QaReleaseItemDto],
    description: `1..${QA_INTAKE_BATCH_MAX} entries, unique by result_id`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(QA_INTAKE_BATCH_MAX)
  @ArrayUnique((item: QaReleaseItemDto) => item?.result_id, {
    message: 'items must not repeat a result_id',
  })
  @ValidateNested({ each: true })
  @Type(() => QaReleaseItemDto)
  items: QaReleaseItemDto[];
}
