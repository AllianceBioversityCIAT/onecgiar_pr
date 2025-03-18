import { IndicatorSupportingResult } from './contribution-to-wp-outcome.dto';

export class ContributionToIndicatorsDto {
  contribution_id: number;
  achieved_in_2024: number;
  toc_result_id: string;
  narrative_achieved_in_2024: string;
  indicator_name: string;
  unit_measurement: string;
  indicator_baseline: string;
  indicator_target: string;
  outcome_name: string;
  outcome_description: string;
  workpackage_name: string;
  contributing_results?: IndicatorSupportingResult[];
}
