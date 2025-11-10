export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: {
    accepted_contributing_initiatives: any;
    pending_contributing_initiatives: any;
  } = {
    accepted_contributing_initiatives: [],
    pending_contributing_initiatives: []
  };
  result_toc_result: ResultToResultInterfaceToc = new ResultToResultInterfaceToc();
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
  target: TargetTocInterface[];
  indicators: IndicatorsTocInterface[];
}

interface TargetTocInterface {
  targetId: number;
  target?: string;
  contributing_indicator?: number;
}

interface IndicatorsTocInterface {
  id: number;
  indicator_statement?: string;
  targets: TargetTocInterface[];
}

export interface CenterInterfacesToc {
  code: string;
  primary?: boolean;
  name: string;
  from_cgspace: boolean;
}

export class ResultToResultInterfaceToc {
  planned_result: boolean = null;
  toc_narrative_progress: string = null;
  initiative_id: number = null;
  official_code: string = null;
  short_name: string = null;
  result_toc_results: ResultTocResultsInterface[] = new Array<ResultTocResultsInterface>();
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
  indicators: IndicatorsTocInterface[] = new Array<IndicatorsTocInterface>();
}
