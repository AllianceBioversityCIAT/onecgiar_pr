import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BulkPhaseInitiativeReportingDto {
  @ApiProperty({
    description:
      'If true, enable reporting for all eligible initiatives (removes overrides). If false, disable for all.',
  })
  @IsBoolean()
  reporting_enabled: boolean;
}
