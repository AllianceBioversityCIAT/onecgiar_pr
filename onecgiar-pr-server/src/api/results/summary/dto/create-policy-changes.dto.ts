export class PolicyChangesDto {
  public policy_stage_id: number;
  public policy_type_id: number;
  public amount: number;
  public status_amount: string;
  public optionsWithAnswers: Option[];
  public institutions: institutionsPCInterface[];
}

interface institutionsPCInterface {
  institutions_id: number;
}

export interface Option {
  result_question_id: number;
  answer_boolean: boolean;
  answer_text: string;
}
