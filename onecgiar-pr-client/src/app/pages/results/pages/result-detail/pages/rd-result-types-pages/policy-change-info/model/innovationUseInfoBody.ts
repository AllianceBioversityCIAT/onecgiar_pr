export class InnovationUseInfoBody {
  public policy_stage_id: number;
  public policy_type_id: number;
  public amount: number;
  public institutions: institutionsPCInterface[] = [];
}

interface institutionsPCInterface {
  institutions_id: number;
}
