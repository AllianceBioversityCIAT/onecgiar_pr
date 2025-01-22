export class IndicatorData {
  contribution_id: number;
  achieved_in_2024: string;
  narrative_achieved_in_2024: string;
  toc_result_id: string;
  indicator_name: string;
  unit_measurement: string;
  indicator_baseline: string;
  indicator_target: string;
  outcome_name: string;
  outcome_description: string;
  workpackage_name: string;
  workpackage_short_name: string;
  submission_status: string;
  initiative_official_code: string;
  indicator_initiative: string;
  indicator_initiative_short: string;
  is_manually_mapped: boolean;
  contributing_results: ContributingResult[];
}

export class ContributingResult {
  contribution_id: string;
  result_id: string;
  result_code: string;
  title: string;
  phase_name: string;
  result_type: string;
  result_submitter: string;
  status_name: string;
  created_date: Date;
}
