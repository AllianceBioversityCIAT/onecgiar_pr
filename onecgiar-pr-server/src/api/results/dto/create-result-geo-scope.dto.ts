import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeoScopeDto {
  @ApiProperty({
    description: 'Identifier of the geographic region or country.',
  })
  id: number;
}

export class CreateResultGeoDto {
  @ApiProperty({ description: 'Geographic scope identifier being assigned.' })
  public geo_scope_id: number;

  @ApiProperty({
    description: 'Result identifier that owns this geographic information.',
  })
  public result_id!: number;

  @ApiProperty({
    description: 'Flag indicating if the result has country coverage.',
  })
  public has_countries: boolean;

  @ApiProperty({
    description: 'Flag indicating if the result covers specific regions.',
  })
  public has_regions: boolean;

  @ApiPropertyOptional({
    description: 'List of regions linked to the result.',
    type: () => [GeoScopeDto],
  })
  public regions: GeoScopeDto[];

  @ApiPropertyOptional({
    description: 'List of countries linked to the result.',
    type: () => [GeoScopeDto],
  })
  public countries: GeoScopeDto[];
}
