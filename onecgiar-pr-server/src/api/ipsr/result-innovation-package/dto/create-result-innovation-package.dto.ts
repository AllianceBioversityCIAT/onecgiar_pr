export class CreateResultInnovationPackageDto {
    public result_id: number;
    public initiative_id: number;
    public geo_scope_id: number;
    public regions: regionsInterface[];
    public countries: countriesInterface[];
}
export interface regionsInterface{
    id: number;
    name: string;
}
export interface countriesInterface{
    id: number;
    name: string;
}
