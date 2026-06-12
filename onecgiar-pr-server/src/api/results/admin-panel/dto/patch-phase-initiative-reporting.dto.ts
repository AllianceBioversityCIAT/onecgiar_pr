import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PatchPhaseInitiativeReportingDto {
  @ApiProperty({
    description:
      'Whether reporting is enabled for this initiative in the phase',
  })
  @IsBoolean()
  reporting_enabled: boolean;
}
