export class PartnersBody {
  public result_type_name: string = null;
  public institutions: institutionsInterface[] = [];
  public institutions_type: institutionsTypeInterface[] = [];
}

interface institutionsInterface {
  institutions_id: number;
  is_active: boolean;
}

interface institutionsTypeInterface {
  institution_types_id: number;
  is_active: boolean;
}
