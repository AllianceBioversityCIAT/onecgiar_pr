export class CreateResultCountryDto {
    public scope_id: number;
    public result_id: number;
    public has_countries: boolean;
    public countries: countriesInterface[];
    
}

export interface countriesInterface{
    id: number;
}
