/** One linked previous result as returned by E3/E4 (design §4.1). */
export interface ImpactPreviousResultItem {
  result_id: number;
  result_code: number;
  title: string;
  result_type_name: string | null;
  phase_name: string | null;
  portfolio_acronym: string | null;
  status_name: string | null;
}

/** Section DTO returned by E3 (read) and E4 (save). */
export interface ImpactLevelInfoDto {
  impact_study_type_id: number | null;
  cgiar_contribution: string | null;
  previously_reported: boolean | null;
  previous_results: ImpactPreviousResultItem[];
}
