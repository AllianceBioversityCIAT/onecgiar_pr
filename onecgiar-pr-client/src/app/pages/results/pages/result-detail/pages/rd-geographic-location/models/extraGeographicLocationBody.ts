export class ExtraGeographicLocationBody {
  public extra_geo_scope_id: number;
  public extra_regions: number[] = [];
  public extra_countries: number[] = [];
  public has_extra_countries: boolean;
  public has_extra_regions: boolean;
  public has_extra_geo_scope: boolean;
}
