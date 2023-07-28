export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: initiativeInterfaces[] = [];
  contributing_np_projects: donorInterfaceToc[] = [];
  contributing_center: centerInterfacesToc[] = [];
  result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  contributors_result_toc_result: resultToResultInterfaceToc[] = [];
  impacts: ResultTocImpactsInterface[];
  pending_contributing_initiatives: any;
  contributing_and_primary_initiative: any;
  targets_indicators:any[];
  impactAreasTargets: any[];
  sdgTargest: any[];
}
interface ResultTocImpactsInterface {
  id: number;
  name: string;
  description: string;
  target: targetTocInterface[];
  indicators: indicatorsTocInterface[];
}
interface initiativeInterfaces {
  id: number;
}
interface targetTocInterface {
  targetId: number;
  target?: string;
}

interface indicatorsTocInterface {
  id: number;
  indicator_statement?: string;
}
interface institutionsInterfaceToc {
  institutions_id: number;
}

export class donorInterfaceToc {
  funder: institutionsInterfaceToc;
  grant_title: string;
  center_grant_id: string;
  lead_center: string;
}
interface centerInterfacesToc {
  code: string;
  primary?: boolean;
  name: string;
}

export class resultToResultInterfaceToc {
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
