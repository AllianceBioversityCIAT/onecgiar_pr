import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdatePlannedResultDto {
  @ApiProperty({
    description:
      'Flag indicating if the result is planned (true) or unplanned (false)',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  planned_result: boolean;
}
