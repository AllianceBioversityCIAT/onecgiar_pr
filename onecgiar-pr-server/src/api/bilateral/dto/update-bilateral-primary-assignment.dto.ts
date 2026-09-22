import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

/**
 * Reassigns the two identities that define a centre-authored bilateral result.
 * They travel together so a result can never point to a project without a
 * primary Science Program that is allocated to it.
 */
export class UpdateBilateralPrimaryAssignmentDto {
  @ApiProperty({ description: 'Lead project ID from CLARISA', example: 123 })
  @IsInt()
  @IsPositive()
  project_id: number;

  @ApiProperty({
    description:
      'W3 project-mapping Science Program / Accelerator ID allocated to the selected project',
    example: 45,
  })
  @IsInt()
  @IsPositive()
  primary_science_program_id: number;

  /**
   * P2-3760 — share of the result attributed to the lead project (0-100).
   * Optional: an older client that does not send it leaves the stored value untouched,
   * which is what keeps the currently installed binary working against this endpoint.
   */
  @ApiProperty({
    description:
      'Percentage of the result attributed to the lead project. Omit to leave the stored value untouched.',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  contribution_percentage?: number;
}
