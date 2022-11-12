export class TheoryOfChangeBody {
  result_id: number;
  contributing_initiatives: initiativeInterfaces[] = [];
  contributing_np_projects: donorInterfaceToc[] = [];
  contributing_center: centerInterfacesToc[] = [];
  result_toc_result: resultToResultInterfaceToc = new resultToResultInterfaceToc();
  contributors_result_toc_result: contributorsResultToResultInterfaceToc[] = [];
}
interface initiativeInterfaces {
  id: number;
}
interface institutionsInterfaceToc {
  institutions_id: number;
}
export class donorInterfaceToc {
  funder?: institutionsInterfaceToc;
  grant_title?: string = '';
  center_grant_id?: string = '';
  lead_center?: centerInterfacesToc = null;
}
interface centerInterfacesToc {
  code: string;
  primary?: boolean;
  name?: string;
}
export class resultToResultInterfaceToc {
  toc_result_id?: number = null;
  outcome_id?: number = null;
  results_id: number = null;
  planned_result: boolean = null;
}
export class contributorsResultToResultInterfaceToc {
  result_toc_result: resultToResultInterfaceToc;
}
