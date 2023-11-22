export class ResultStatusData {
  public static readonly Editing = new ResultStatusData('editing', 1);
  public static readonly QualityAssessed = new ResultStatusData(
    'quality-assessed',
    2,
  );
  public static readonly Submitted = new ResultStatusData('submitted', 3);
  public static readonly Discontinued = new ResultStatusData('discontinued', 4);

  private constructor(
    public readonly name: string,
    public readonly value: number,
  ) {}

  public static getFromName(name: string): ResultStatusData | undefined {
    return (Object.values(this) as ResultStatusData[]).find(
      (n) => n.name === name,
    );
  }

  public static getFromValue(value: number): ResultStatusData | undefined {
    return (Object.values(this) as ResultStatusData[]).find(
      (n) => n.value === value,
    );
  }
}
