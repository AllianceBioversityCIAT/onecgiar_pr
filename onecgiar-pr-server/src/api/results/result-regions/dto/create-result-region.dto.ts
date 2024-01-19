export class CreateResultRegionDto {
  public geo_scope_id: number;
  public result_id: number;
  public has_regions: boolean;
  public regions: regionsInterface[];
}

export interface regionsInterface {
  id: number;
}
