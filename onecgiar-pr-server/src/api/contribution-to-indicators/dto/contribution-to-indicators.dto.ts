import { ContributionToIndicatorResultsDto } from './contribution-to-indicator-results.dto';

export class ContributionToIndicatorsDto {
  id: number;
  toc_result_id: string;
  achieved_in_2024: number;
  narrative_achieved_in_2024: string;
  contributing_results?: ContributionToIndicatorResultsDto[];
}
