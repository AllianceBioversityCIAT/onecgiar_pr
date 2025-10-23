export class CreateResultRegionDto {
  public geo_scope_id: number;
  public extra_geo_scope_id?: number | null;
  public result_id: number;
  public has_regions: boolean;
  public has_extra_regions?: boolean;
  public regions: regionsInterface[];
  public extra_regions?: regionsInterface[];
}

export interface regionsInterface {
  id: number;
}
