export class ResultFolderTypeData {
  public static readonly typeOneReport = new ResultFolderTypeData(
    'type-one-report',
    1,
  );

  private constructor(
    public readonly name: string,
    public readonly value: number,
  ) {}

  public static getFromName(name: string): ResultFolderTypeData | undefined {
    return (Object.values(this) as ResultFolderTypeData[]).find(
      (n) => n.name === name,
    );
  }

  public static getFromValue(value: number): ResultFolderTypeData | undefined {
    return (Object.values(this) as ResultFolderTypeData[]).find(
      (n) => n.value === value,
    );
  }
}
