export class InnovationPackageCreatorBody {
  title = null;
  official_code = null;
  result_code = null;
  //not necesary
  result_id = null;
  initiative_id = null;
  geo_scope_id = null;
  regions: regionsOrCountries[] = [];
  countries: regionsOrCountries[] = [];
}

interface regionsOrCountries {
  id: string | number;
}
