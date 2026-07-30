export type IndicatorNumberTargetValue = string | number | null;

export type ExistingResultContributorRecord = {
  result_toc_result_id: number;
  result_id: number;
  toc_result_id: number;
  obj_results?: {
    title?: string;
    result_code?: string | number;
    result_type_id?: number;
    version_id?: number;
    status_id?: number;
    obj_status?: {
      status_name?: string;
    };
  };
  obj_results_toc_result_indicators?: Array<{
    toc_results_indicator_id?: string;
    obj_result_indicator_targets?: Array<{
      contributing_indicator?: IndicatorNumberTargetValue;
      is_active?: boolean;
    }>;
  }>;
};

export type ContributorRoleInfo = {
  role_id: number | null;
  role_name: string | null;
};
