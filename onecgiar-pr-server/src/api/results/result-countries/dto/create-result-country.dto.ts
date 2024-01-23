import { CreateResultCountriesSubNationalDto } from '../../result-countries-sub-national/dto/create-result-countries-sub-national.dto';

export class CreateResultCountryDto {
  public geo_scope_id: number;
  public result_id: number;
  public has_countries: boolean;
  public countries: countriesInterface[];
}

export interface countriesInterface {
  id: number;
  sub_national?: CreateResultCountriesSubNationalDto[];
}
