import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateResultGeoDto, GeoScopeDto } from "../../../results/dto/create-result-geo-scope.dto";

export class CreateGeographicLocationDto extends CreateResultGeoDto{
  @ApiPropertyOptional({
    description: 'Extra geographic scope identifier being assigned (nullable).',
    nullable: true,
    type: Number,
  })
  public extra_geo_scope_id?: number | null;

  @ApiProperty({
    description: 'Flag indicating if the result has extra country coverage.',
  })
  public has_extra_countries: boolean;

  @ApiProperty({
    description: 'Flag indicating if the result covers extra specific regions.',
  })
  public has_extra_regions: boolean;

  @ApiPropertyOptional({
    description: 'List of extra regions linked to the result.',
    type: () => [GeoScopeDto],
  })
  public extra_regions: GeoScopeDto[];

  @ApiPropertyOptional({
    description: 'List of extra countries linked to the result.',
    type: () => [GeoScopeDto],
  })
  public extra_countries: GeoScopeDto[];
}
