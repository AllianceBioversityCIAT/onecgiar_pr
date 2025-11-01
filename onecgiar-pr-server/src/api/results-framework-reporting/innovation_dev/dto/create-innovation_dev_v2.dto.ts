import { ResultIpMeasure } from '../../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { Evidence } from '../../../results/evidences/entities/evidence.entity';
import { ResultActor } from '../../../results/result-actors/entities/result-actor.entity';
import { NonPooledProjectBudget } from '../../../results/result_budget/entities/non_pooled_proyect_budget.entity';
import { ResultInitiativeBudget } from '../../../results/result_budget/entities/result_initiative_budget.entity';
import { ResultInstitutionsBudget } from '../../../results/result_budget/entities/result_institutions_budget.entity';
import { ResultsByInstitutionType } from '../../../results/results_by_institution_types/entities/results_by_institution_type.entity';

export class CreateInnovationDevDtoV2 {
  public result_innovation_dev_id: number;
  public short_title: string;
  public innovation_characterization_id: number;
  public innovation_nature_id: number;
  public innovation_readiness_level_id: number;
  public is_new_variety: boolean;
  public number_of_varieties: number;
  public innovation_developers: string;
  public innovation_collaborators: string;
  public readiness_level: string;
  public evidences_justification: string;
  public innovation_acknowledgement: string;
  public innovation_pdf!: boolean;
  public innovation_user_to_be_determined!: boolean;
  public responsible_innovation_and_scaling!: TopLevelQuestionsV2;
  public intellectual_property_rights!: TopLevelQuestionsV2;
  public innovation_team_diversity!: TopLevelQuestionsV2;
  public megatrends!: TopLevelQuestionsV2;
  public reference_materials!: Evidence[];
  public pictures!: Evidence[];
  public innovatonUse: innovatonUseInterface;
  public initiative_expected_investment: ResultInitiativeBudget[];
  public bilateral_expected_investment: NonPooledProjectBudget[];
  public institutions_expected_investment: ResultInstitutionsBudget[];
  public has_scaling_studies: boolean;
  public scaling_studies_urls: string[];
}
export interface SubOptionV2 {
  result_question_id: number;
  answer_boolean: boolean;
  answer_text: string;
}

export interface OptionV2 {
  result_question_id: number;
  answer_boolean: boolean;
  answer_text: string;
  subOptions: SubOptionV2[];
}

export interface TopLevelQuestionsV2 {
  q1: {
    options: OptionV2[];
  };
  q2: {
    options: OptionV2[];
  };
  q3: {
    options: OptionV2[];
  };
  q4: {
    options: OptionV2[];
  };
  options: OptionV2[];
}

export interface innovatonUseInterface {
  actors: ResultActor[];
  organization: ResultsByInstitutionType[];
  measures: ResultIpMeasure[];
}
