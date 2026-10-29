// @akili-spec quality-assurance/qa-results-feed
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  QA_RESULTS_BATCH_MAX,
  QA_RESULTS_FIELD_KEY_MAX_LENGTH,
  QA_RESULTS_PHASE_YEAR_MAX,
  QA_RESULTS_PHASE_YEAR_MIN,
  QA_RESULTS_RESULT_ID_MAX,
} from '../qa-results.constants';

/**
 * QRF-R-2 / R-7: body of `POST /api/qa/results/details`. The year is mandatory and never derived from the clock; the batch is
 * bounded as SENT (duplicates are answered once, by the service, but still count against the bound). An unknown key of the body is
 * stripped by the pipe's whitelist.
 */
export class QaResultsDetailsDto {
  @ApiProperty({ example: 2026, description: 'Phase year (required)' })
  @IsInt()
  @Min(QA_RESULTS_PHASE_YEAR_MIN)
  @Max(QA_RESULTS_PHASE_YEAR_MAX)
  phase_year: number;

  @ApiProperty({
    example: [31084, 31085],
    description: `Result ids, 1..${QA_RESULTS_BATCH_MAX} positive integers; duplicates are answered once`,
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(QA_RESULTS_BATCH_MAX)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(QA_RESULTS_RESULT_ID_MAX, { each: true })
  result_ids: number[];

  @ApiPropertyOptional({
    example: ['general.title'],
    description:
      'Top-level catalog keys to return (a subfield key is a 400). Absent = every applicable field',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(QA_RESULTS_FIELD_KEY_MAX_LENGTH, { each: true })
  field_keys?: string[];
}
