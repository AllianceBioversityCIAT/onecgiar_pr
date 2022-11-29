export class ShareRequestBody {
  public initiativeShareId: number[] = [];
  public initiative_id: number;
  public toc_result_id!: number; //opcional dependiendo de donde se haga list /toc
  public action_area_outcome_id!: number; //opcional dependiendo de donde se haga list /toc
  public isToc: boolean; //si se hace desde el toc true de resto false
  public planned_result!: number;
}
