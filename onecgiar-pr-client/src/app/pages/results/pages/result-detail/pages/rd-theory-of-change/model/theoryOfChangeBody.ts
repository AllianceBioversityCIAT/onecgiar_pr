export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: initiativeInterfaces[] = [];
  contributing_np_projects: donorInterfaceToc[] = [];
  contributing_center: centerInterfacesToc[] = [];
  result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  contributors_result_toc_result: resultToResultInterfaceToc[] = [];
}
interface initiativeInterfaces {
  id: number;
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
}
