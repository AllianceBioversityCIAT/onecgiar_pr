import { ResultIpMeasure } from '../../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { Evidence } from '../../evidences/entities/evidence.entity';
import { ResultActor } from '../../result-actors/entities/result-actor.entity';
import { NonPooledProjectBudget } from '../../result_budget/entities/non_pooled_proyect_budget.entity';
import { ResultInitiativeBudget } from '../../result_budget/entities/result_initiative_budget.entity';
import { ResultInstitutionsBudget } from '../../result_budget/entities/result_institutions_budget.entity';
import { ResultsByInstitutionType } from '../../results_by_institution_types/entities/results_by_institution_type.entity';
import { InvestmentRowDto } from '../../result_budget/dto/investment-row.dto';

export class CreateInnovationDevDto {
  public result_innovation_dev_id: number;
  public short_title: string;
  public innovation_characterization_id: number;
  public innovation_nature_id: number;
  public innovation_readiness_level_id: number;
  public is_new_variety: boolean;
  public has_scaling_studies: boolean;
  public scaling_studies_urls: string[];
  public number_of_varieties: number;
  public innovation_developers: string;
  public innovation_collaborators: string;
  public readiness_level: string;
  public evidences_justification: string;
  public innovation_acknowledgement: string;
  public innovation_pdf!: boolean;
  public innovation_user_to_be_determined!: boolean;
  public responsible_innovation_and_scaling!: TopLevelQuestions;
  public intellectual_property_rights!: TopLevelQuestions;
  public innovation_team_diversity!: TopLevelQuestions;
  public megatrends!: TopLevelQuestions;
  public reference_materials!: Evidence[];
  public pictures!: Evidence[];
  public innovatonUse: innovatonUseInterface;
  public initiative_expected_investment: ResultInitiativeBudget[];
  public bilateral_expected_investment: NonPooledProjectBudget[];
  public institutions_expected_investment: ResultInstitutionsBudget[];

  /**
   * P2-3390 — the same three investment tables in the flat contract, alongside (not instead of) the
   * legacy nested keys above. Optional; an absent key is a no-op.
   *
   * A caller sends one family or the other, never both: W1/W2 keeps sending
   * `*_expected_investment` (handled by `InnoDevService`, which resolves the legacy
   * `non_pooled_project` catalogue) and the bilateral form sends these, handled by
   * `ResultInvestmentService`, which keys the project row by `result_project_id`.
   */
  public investment_programs?: InvestmentRowDto[];
  public investment_bilateral?: InvestmentRowDto[];
  public investment_partners?: InvestmentRowDto[];
}
export interface SubOption {
  result_question_id: number;
  answer_boolean: boolean;
  answer_text: string;
}

export interface Option {
  result_question_id: number;
  answer_boolean: boolean;
  answer_text: string;
  subOptions: SubOption[];
}

export interface TopLevelQuestions {
  q1: {
    options: Option[];
  };
  q2: {
    options: Option[];
  };
  q3: {
    options: Option[];
  };
  options: Option[];
}

export interface innovatonUseInterface {
  actors: ResultActor[];
  organization: ResultsByInstitutionType[];
  measures: ResultIpMeasure[];
}
