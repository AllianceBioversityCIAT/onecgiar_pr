export class GeneralInfoBody {
  public result_type_name: string = null;
  public result_level_name: string = null;
  public result_id: number = null;
  public initiative_id: number = null;
  public result_type_id: number = null;
  public result_level_id: number = null;
  public result_name: string = null;
  public result_description: string = null;
  public gender_tag_id: number = null;
  public climate_change_tag_id: number = null;
  public institutions: institutionsInterface[] = [];
  public institutions_type: institutionsTypeInterface[] = [];
  public krs_url: string = null;
  public is_krs: boolean = null;
  public reporting_year: string = null;
  public lead_contact_person: string = null;
}

interface institutionsInterface {
  institutions_id: number;
  is_active: boolean;
  institutions_type_name: string;
}

interface institutionsTypeInterface {
  institution_types_id: number;
  is_active: boolean;
  institutions_type_name: string;
}
