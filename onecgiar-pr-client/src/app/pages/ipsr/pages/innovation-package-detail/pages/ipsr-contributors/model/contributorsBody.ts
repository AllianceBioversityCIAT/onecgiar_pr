export class ContributorsBody {
  // result_id: number = null;
  contributing_initiatives: initiativeInterfaces[] = [];
  contributing_np_projects: donorInterfaceToc[] = [];
  contributing_center: centerInterfacesToc[] = [];
  result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  contributors_result_toc_result: resultToResultInterfaceToc[] = [];
  pending_contributing_initiatives: shareResultRequestInterface[] = [];
  institutions: institutionsInterface[] = [];
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
  result_toc_result_id?: number = null;
  toc_result_id?: number = null;
  action_area_outcome_id?: number = null;
  results_id: number = null;
  planned_result: boolean = null;
  initiative_id: number = null;
  short_name: string = null;
  official_code: string = null;
}

interface shareResultRequestInterface {
  id: number;
  share_result_request_id: number;
  is_active: boolean;
  initiative_name: string;
  official_code: string;
}
