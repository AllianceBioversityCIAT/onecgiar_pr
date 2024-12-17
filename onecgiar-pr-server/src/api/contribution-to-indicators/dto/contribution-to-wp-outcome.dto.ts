export class ContributionToWpOutcomeDto {
  workpackage: ContributionWorkpackage;
}
export class ContributionWorkpackage {
  toc_results: TocResult[];
  workpackage_code: number;
  workpackage_name: string;
  workpackage_short_name: string;
}

export class TocResult {
  indicators: Indicator[];
  toc_result_id: number;
  toc_result_uuid: string;
  toc_result_title: string;
  toc_result_description: string;
}

export class Indicator {
  indicator_id: number;
  indicator_name: string;
  indicator_uuid: string;
  indicator_baseline: string;
  is_indicator_custom: number;
  indicator_description: string;
  indicator_target_date?: string;
  indicator_target_value?: string;
  indicator_achieved_value: string;
  indicator_submission_status: number;
  indicator_achieved_narrative: string;
  indicator_supporting_results?: IndicatorSupportingResult[];
}

export class IndicatorSupportingResult {
  title: string;
  is_active: boolean;
  result_id: number;
  phase_name: string;
  version_id: number;
  result_code: number;
  result_type: string;
  status_name: string;
  created_date: string;
  contribution_id: number;
  result_submitter: string;
  is_manually_mapped: number;
}
