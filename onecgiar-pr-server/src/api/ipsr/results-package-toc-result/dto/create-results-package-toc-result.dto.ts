export class CreateResultsPackageTocResultDto {
  result_id: number;
  contributing_initiatives?: {
    accepted_contributing_initiatives: InitiativeInterfaces[];
    pending_contributing_initiatives: ShareResultRequestInterface[];
  };
  contributing_np_projects: DonorInterfaceToc[];
  contributing_center: CenterInterfacesToc[];
  result_toc_result: {
    planned_result: boolean;
    result_toc_results: ResultToResultInterfaceToc[];
  };
  contributors_result_toc_result: [
    {
      planned_result: boolean;
      initiative_id: number;
      result_toc_results: ResultToResultInterfaceToc[];
    },
  ];
  // pending_contributing_initiatives: shareResultRequestInterface[];
  institutions: InstitutionsInterface[];
  impacts?: any[];
  changePrimaryInit: number;
}

export class InstitutionsInterface {
  institutions_id: number;
  deliveries?: number[];
}

export class InitiativeInterfaces {
  id: number;
  is_active: boolean;
}

export class DonorInterfaceToc {
  id: number;
  funder: number;
  grant_title: string;
  center_grant_id: string;
  lead_center: string;
}
export class CenterInterfacesToc {
  code: string;
  primary?: boolean;
}

export class ResultToResultInterfaceToc {
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

export class ShareResultRequestInterface {
  id: number;
  share_result_request_id: number;
  is_active: boolean;
}
