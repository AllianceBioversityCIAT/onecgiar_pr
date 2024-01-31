import { ShareResultRequest } from '../entities/share-result-request.entity';

export class CreateShareResultRequestDto {
  request_status_id: number;
  result_request: ShareResultRequest;
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: resultToResultInterfaceToc[];
  };
  changePrimaryInit: number;
}

interface resultToResultInterfaceToc {
  result_toc_result_id?: number;
  toc_result_id?: number;
  action_area_outcome_id?: number;
  results_id: number;
  planned_result?: boolean;
  initiative_id: number;
  indicators?: any[];
  impactAreasTargets?: any[];
  sdgTargest?: any[];
  actionAreaOutcome?: any[];
  targetsIndicators?: any[];
  is_sdg_action_impact: boolean;
  toc_progressive_narrative: string;
}
