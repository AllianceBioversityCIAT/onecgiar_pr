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
  submission_status: string;
  contributing_results: ContributingResult[];
}

export class ContributingResult {
  contribution_id: string;
  result_id: string;
  result_code: string;
  result_title: string;
  phase_name: string;
  result_type: string;
  result_submitter: string;
  result_status: string;
  result_creation_date: Date;
  linked_results: LinkedResult[];
}

export class LinkedResult {
  result_id: number;
  phase_name: string;
  result_code: number;
  result_type: string;
  result_title: string;
  result_status: string;
  contribution_id: string;
  result_submitter: string;
  result_creation_date: Date;
}
