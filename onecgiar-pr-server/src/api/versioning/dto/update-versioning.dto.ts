export class UpdateVersioningDto {
  public phase_name: string;
  public previous_phase: number;
  public status: boolean;
  public portfolio_id?: number;
}
