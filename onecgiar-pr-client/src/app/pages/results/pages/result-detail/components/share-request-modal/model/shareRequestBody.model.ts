export class ShareRequestBody {
  planned_result: boolean = null;
  initiative_id: number = null;
  official_code: string = null;
  short_name: string = null;
  result_toc_results: ResultTocResultsInterface[] = new Array<ResultTocResultsInterface>();
  showMultipleWPsContent = true;
}

export class ResultTocResultsInterface {
  result_toc_result_id?: number = null;
  toc_result_id?: number = null;
  action_area_outcome_id?: number = null;
  results_id: number = null;
  planned_result: boolean = null;
  id?: number = null;
  short_name: string = null;
  official_code: string = null;
  initiative_id: number | string = null;
  toc_level_id?: number | string = null;
  uniqueId?: string | null = null;
}
