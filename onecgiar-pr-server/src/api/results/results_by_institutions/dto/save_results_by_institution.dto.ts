export class SaveResultsByInstitutionDto {
  public result_id: number;
  public no_applicable_partner: boolean;
  public institutions: institutionsInterface[];
}

interface institutionsInterface {
  institution_mqap_name?: string;
  institution_mqap_id?: number;
  institutions_id: number;
  deliveries?: number[];
}
