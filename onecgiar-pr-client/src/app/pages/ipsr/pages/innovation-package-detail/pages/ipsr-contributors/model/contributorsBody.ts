export class ContributorsBody {
  // result_id: number = null;
  contributing_initiatives: {
    accepted_contributing_initiatives: any;
    pending_contributing_initiatives: any;
  } = { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] };
  contributing_np_projects: donorInterfaceToc[] = [];
  contributing_center: centerInterfacesToc[] = [];
  result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  contributors_result_toc_result: any = [];
  pending_contributing_initiatives: shareResultRequestInterface[] = [];
  institutions: institutionsInterface[] = [];
  contributingInitiativeNew: any = [];
}

interface institutionsInterface {
  institutions_id: number;
  institutions_type_name: string;
  institutions_name: string;
  deliveries?: number[];
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
  is_active: boolean;
}

interface institutionsInterfaceToc {
  institutions_id: number;
}

export class donorInterfaceToc {
  funder: number = null;
  grant_title: string = null;
  center_grant_id: string = null;
  lead_center: string = null;
}
interface centerInterfacesToc {
  code: string;
  name: string;
  primary?: boolean;
}

export class resultToResultInterfaceToc {
  planned_result: boolean = null;
  initiative_id: number = null;
  official_code: string = null;
  short_name: string = null;
  result_toc_results: resultTocResultsInterface[] = new Array<resultTocResultsInterface>();
}

interface shareResultRequestInterface {
  id: number;
  share_result_request_id: number;
  is_active: boolean;
  initiative_name: string;
  official_code: string;
}
export class resultTocResultsInterface {
  result_toc_result_id?: number = null;
  toc_result_id?: number = null;
  action_area_outcome_id?: number = null;
  results_id: number = null;
  planned_result: boolean = null;
  id: number = null;
  short_name: string = null;
  official_code: string = null;
  initiative_id: number | string = null;
  toc_level_id?: number | string = null;
}
