import { ResultsInvestmentDiscontinuedOption } from '../results-investment-discontinued-options/entities/results-investment-discontinued-option.entity';
import { ResultsByInstitutionType } from '../results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultsByInstitution } from '../results_by_institutions/entities/results_by_institution.entity';

export class GeneralInformationDto {
  public result_id: number;
  public is_replicated: boolean;
  public initiative_id: number;
  public result_type_id: number;
  public result_type_name: string;
  public result_level_id: number;
  public result_level_name: string;
  public result_name: string | null;
  public result_description: string | null;
  public gender_tag_id: number | null;
  public climate_change_tag_id: number | null;
  public nutrition_tag_level_id: number | null;
  public environmental_biodiversity_tag_level_id: number | null;
  public poverty_tag_level_id: number | null;
  public institutions: ResultsByInstitution[];
  public institutions_type: ResultsByInstitutionType[];
  public krs_url: string | null;
  public is_krs: boolean;
  public lead_contact_person: string | null;
  public phase_name: string;
  public phase_year: number;
  public is_discontinued: boolean;
  public discontinued_options: ResultsInvestmentDiscontinuedOption[];
}
