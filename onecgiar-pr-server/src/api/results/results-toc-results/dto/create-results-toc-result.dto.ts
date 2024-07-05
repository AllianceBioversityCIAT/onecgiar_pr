export class CreateResultsTocResultDto {
  result_id?: number;
  contributing_initiatives?: initiativeInterfaces[];
  contributing_np_projects?: donorInterfaceToc[];
  contributing_center?: centerInterfacesToc[];
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: resultToResultInterfaceToc[];
  };
  contributors_result_toc_result?: [
    {
      planned_result: boolean;
      initiative_id: number;
      result_toc_results: resultToResultInterfaceToc[];
    },
  ];
  impacts?: ResultTocImpactsInterface[];
  pending_contributing_initiatives?: shareResultRequestInterface[];
  bodyNewTheoryOfChanges?: any[];
  impactsTarge?: any[];
  sdgTargets?: any[];
  bodyActionArea?: any[];
  changePrimaryInit: number;
}

interface ResultTocImpactsInterface {
  id: number;
  name: string;
  description: string;
  target: targetTocInterface[];
  indicators: indicatorsTocInterface[];
}

interface targetTocInterface {
  targetId: number;
  target?: string;
}

interface indicatorsTocInterface {
  id: number;
  indicator_statement?: string;
}

interface initiativeInterfaces {
  id: number;
}

interface donorInterfaceToc {
  funder: number;
  grant_title: string;
  center_grant_id: string;
  lead_center: string;
}
interface centerInterfacesToc {
  code: string;
  primary?: boolean;
}

interface resultToResultInterfaceToc {
  result_toc_result_id?: number;
  toc_result_id?: number;
  action_area_outcome_id?: number;
  results_id: number;
  planned_result?: boolean;
  initiative_id: number;
  toc_level_id?: number;
  indicators?: any[];
  impactAreasTargets?: any[];
  sdgTargest?: any[];
  actionAreaOutcome?: any[];
  targetsIndicators?: any[];
  is_sdg_action_impact: boolean;
  toc_progressive_narrative: string;
}

interface shareResultRequestInterface {
  id: number;
  share_result_request_id: number;
  is_active: boolean;
}
