export class ContributorsBody {
  contributing_initiatives: {
    accepted_contributing_initiatives: any;
    pending_contributing_initiatives: any;
  } = { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] };
  contributing_np_projects: DonorInterfaceToc[] = [];
  contributing_center: CenterInterfacesToc[] = [];
  result_toc_result: ResultToResultInterfaceToc = new ResultToResultInterfaceToc();
  contributors_result_toc_result: any = [];
  pending_contributing_initiatives: ShareResultRequestInterface[] = [];
  institutions: InstitutionsInterface[] = [];
  contributingInitiativeNew: any = [];
}

interface InstitutionsInterface {
  institutions_id: number;
  institutions_type_name: string;
  institutions_name: string;
  deliveries?: number[];
}

export class DonorInterfaceToc {
  funder: number = null;
  grant_title: string = null;
  center_grant_id: string = null;
  lead_center: string = null;
}
interface CenterInterfacesToc {
  code: string;
  name: string;
  primary?: boolean;
}

export class ResultToResultInterfaceToc {
  planned_result: boolean = null;
  initiative_id: number = null;
  official_code: string = null;
  short_name: string = null;
  result_toc_results: ResultTocResultsInterface[] = new Array<ResultTocResultsInterface>();
}

interface ShareResultRequestInterface {
  id: number;
  share_result_request_id: number;
  is_active: boolean;
  initiative_name: string;
  official_code: string;
}
export class ResultTocResultsInterface {
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
