import { ResultByInstitutionsByDeliveriesType } from '../../result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { ResultsByInstitution } from '../entities/results_by_institution.entity';

export class SaveResultsByInstitutionDto {
  public result_id: number;
  public no_applicable_partner: boolean;
  public institutions: ResultsByInstitution[];
  public mqap_institutions: ResultsByInstitution[];
}

export interface institutionsInterface {
  institution_mqap_id?: number;
  institutions_id: number;
  delivery?: ResultByInstitutionsByDeliveriesType[];
  institution_roles_id?: number;
}
