export class GetImpactTargetAreaDto {
  public result_impact_area_target_id: number;
  public result_id: number;
  public targetId: number;
  public is_active: boolean;
  public created_by: number;
  public created_date: Date;
  public last_updated_by!: number;
  public last_updated_date!: Date;
  public impact_area_id: number;
}
