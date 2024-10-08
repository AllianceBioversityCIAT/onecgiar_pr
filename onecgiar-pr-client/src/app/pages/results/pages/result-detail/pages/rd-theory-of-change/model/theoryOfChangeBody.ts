export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: initiativeInterfaces[] = [];
  // result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  contributors_result_toc_result: any = [];
  impacts: ResultTocImpactsInterface[];
  pending_contributing_initiatives: any;
  contributing_and_primary_initiative: any[];
  bodyNewTheoryOfChanges: any[];
  impactsTarge: any[];
  sdgTargets: any[];
  bodyActionArea: any[];
  planned_result: boolean;
  changePrimaryInit: number;
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

export interface centerInterfacesToc {
  code: string;
  primary?: boolean;
  name: string;
  from_cgspace: boolean;
}

export class resultToResultInterfaceToc {
  planned_result: boolean = null;
  initiative_id: number = null;
  official_code: string = null;
  short_name: string = null;
  result_toc_results: resultTocResultsInterface[] = new Array<resultTocResultsInterface>();
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
