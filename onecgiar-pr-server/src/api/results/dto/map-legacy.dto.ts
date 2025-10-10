import { ApiProperty } from '@nestjs/swagger';

export class MapLegacy {
  @ApiProperty({
    description: 'Initiative identifier where the legacy result belongs.',
  })
  public initiative_id: number;

  @ApiProperty({ description: 'Legacy system identifier being linked.' })
  public legacy_id: string;

  @ApiProperty({
    description: 'Target result type identifier in the new system.',
  })
  public result_type_id: number;

  @ApiProperty({
    description: 'Target result level identifier in the new system.',
  })
  public result_level_id: number;

  @ApiProperty({ description: 'Handler used to reference the mapped result.' })
  public handler!: string;
}
