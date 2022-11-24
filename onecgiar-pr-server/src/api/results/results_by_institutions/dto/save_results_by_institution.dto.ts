import { MQAPInstitutionDto } from './mqap-institutions.dto';

export class SaveResultsByInstitutionDto {
  public result_id: number;
  public no_applicable_partner: boolean;
  public institutions: institutionsInterface[];
  public mqap_institutions: MQAPInstitutionDto[];
}

interface institutionsInterface {
  institution_mqap_id?: number;
  institutions_id: number;
  deliveries?: number[];
}
