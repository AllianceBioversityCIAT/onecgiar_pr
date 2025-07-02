import { ApiProperty } from '@nestjs/swagger';
import { ADUser } from '../../../auth/services/active-directory.service';
import { ResultsInvestmentDiscontinuedOption } from '../results-investment-discontinued-options/entities/results-investment-discontinued-option.entity';

export class CreateGeneralInformationResultDto {
  public result_id: number;
  public initiative_id: number;
  public result_type_id: number;
  public result_level_id: number;
  public result_name: string;
  public result_description: string;
  public gender_tag_id: number;
  public climate_change_tag_id: number;
  public nutrition_tag_level_id: number;
  public environmental_biodiversity_tag_level_id: number;
  public poverty_tag_level_id: number;
  public institutions: institutionsInterface[];
  public institutions_type: institutionsTypeInterface[];
  public krs_url!: string;
  public is_krs!: boolean;
  public lead_contact_person!: string;
  public lead_contact_person_data?: ADUser;
  public is_discontinued!: boolean;
  public discontinued_options!: ResultsInvestmentDiscontinuedOption[];
}

interface institutionsInterface {
  institutions_id: number;
}

interface institutionsTypeInterface {
  institutions_type_id: number;
}
