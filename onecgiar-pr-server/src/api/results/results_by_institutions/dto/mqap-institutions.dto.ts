import { ResultsByInstitution } from '../entities/results_by_institution.entity';

export class MQAPInstitutionDto {
  result_kp_mqap_institution_id: number;
  predicted_institution_id: number;
  intitution_name: string;
  confidant: number;
  user_matched_institution: ResultsByInstitution;
}
