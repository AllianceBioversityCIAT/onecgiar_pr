import { ApiProperty } from '@nestjs/swagger';

export class CreateResultDto {
  @ApiProperty({ description: 'Initiative identifier that owns the result.' })
  public initiative_id: number;

  @ApiProperty({
    description: 'Type identifier describing the result category.',
  })
  public result_type_id: number;

  @ApiProperty({ description: 'Level identifier associated with the result.' })
  public result_level_id: number;

  @ApiProperty({ description: 'Public title or name for the result.' })
  public result_name!: string;

  @ApiProperty({
    description: 'Friendly handler used to reference the result.',
  })
  public handler!: string;
}
