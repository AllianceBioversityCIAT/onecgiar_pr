import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

/**
 * The centre may only move a bilateral result to Pending review after the
 * stored quality assessment has been shown and explicitly decided.
 */
export class SubmitForReviewDto {
  @ApiProperty({ description: 'Stored bilateral quality-assessment id.' })
  @IsInt()
  @IsNotEmpty()
  assessment_id: number;

  @ApiProperty({ enum: ['submitted_anyway', 'submitted_without_check'] })
  @IsIn(['submitted_anyway', 'submitted_without_check'])
  decision: 'submitted_anyway' | 'submitted_without_check';
}
