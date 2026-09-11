import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

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
      'Primary Science Program / Accelerator ID allocated to the selected project',
    example: 45,
  })
  @IsInt()
  @IsPositive()
  primary_science_program_id: number;
}
