export class DepthSearch {
  public id: string;
  public result_code: string;
  /** Null for legacy rows: they belong to no PRMS reporting phase. */
  public version_id: string | null;
  public title: string;
  public description!: string;
  public crp: string;
  public year: number;
  public legacy: number;
  public result_level_id: number | null;
  /** Display type: result type for PRMS rows, indicator type for legacy ones. */
  public type: string | null;
  public result_type_name: string | null;
}
