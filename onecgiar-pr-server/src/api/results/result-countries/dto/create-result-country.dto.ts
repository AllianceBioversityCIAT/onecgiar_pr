import { CreateResultCountriesSubNationalDto } from '../../result-countries-sub-national/dto/create-result-countries-sub-national.dto';

export class CreateResultCountryDto {
  public geo_scope_id: number;
  public extra_geo_scope_id?: number | null;
  public result_id: number;
  public has_countries: boolean;
  public has_extra_countries?: boolean;
  public countries: countriesInterface[];
  public extra_countries?: countriesInterface[];
}

export interface countriesInterface {
  id: number;
  sub_national?: CreateResultCountriesSubNationalDto[];
}
