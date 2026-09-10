export class PolicyChangesDto {
  public policy_stage_id: number;
  public policy_type_id: number;
  public amount: number;
  public status_amount: string;
  /**
   * P2-2932 AC4 — the number of key actors influenced, captured only when the answer to
   * "Is this result related to" is question 51. Null for every other sub-category.
   */
  public actors_influenced: number;
  public result_related_engagement: boolean;
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
