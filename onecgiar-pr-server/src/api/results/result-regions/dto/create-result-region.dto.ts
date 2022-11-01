export class CreateResultRegionDto {
    public scope_id: number;
    public result_id: number;
    public has_regions: boolean;
    public regions: regionsInterface[];
}

export interface regionsInterface{
    id: number;
}
