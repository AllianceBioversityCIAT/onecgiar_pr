export class GeographicLocationBody {
  public has_countries: boolean;
  public has_regions: boolean;
  public regions: number[] = [];
  public countries: number[] = [];
  public geo_scope_id: number;
}
