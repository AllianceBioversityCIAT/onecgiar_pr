export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: initiativeInterfaces[];
  contributing_np_projects: donorInterfaceToc[];
  contributing_center: centerInterfacesToc[];
  result_toc_result: resultToResultInterfaceToc;
  contributors_result_toc_result: resultToResultInterfaceToc[];
  impacts: ResultTocImpactsInterface[];
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

interface institutionsInterfaceToc {
  institutions_id: number;
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
  planned_result: boolean;
  initiative_id: number;
}
