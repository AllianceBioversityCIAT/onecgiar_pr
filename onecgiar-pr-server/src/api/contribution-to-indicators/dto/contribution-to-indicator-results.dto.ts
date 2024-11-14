export class ContributionToIndicatorResultsDto {
  contribution_id: number;
  result_id: number;
  result_title: string;
  result_code: number;
  phase_name: string;
  result_type: string;
  result_submitter: string;
  result_status: string;
  result_creation_date: string;
  result_link: string;
  linked_results?: ContributionToIndicatorResultsDto[];
}
