export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: InitiativeInterfaces[];
  contributing_np_projects: DonorInterfaceToc[];
  contributing_center: CenterInterfacesToc[];
  result_toc_result: ResultToResultInterfaceToc;
  contributors_result_toc_result: ResultToResultInterfaceToc[];
  impacts: ResultTocImpactsInterface[];
}

interface ResultTocImpactsInterface {
  id: number;
  name: string;
  description: string;
  target: TargetTocInterface[];
  indicators: IndicatorsTocInterface[];
}

interface TargetTocInterface {
  targetId: number;
  target?: string;
}

interface IndicatorsTocInterface {
  id: number;
  indicator_statement?: string;
}

interface InitiativeInterfaces {
  id: number;
}

interface DonorInterfaceToc {
  funder: number;
  grant_title: string;
  center_grant_id: string;
  lead_center: string;
}
interface CenterInterfacesToc {
  code: string;
  primary?: boolean;
}

interface ResultToResultInterfaceToc {
  result_toc_result_id?: number;
  toc_result_id?: number;
  action_area_outcome_id?: number;
  results_id: number;
  planned_result: boolean;
  initiative_id: number;
}
