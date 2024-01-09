export class ActiveElementData {
  public static readonly active = new ActiveElementData('active', true);
  public static readonly inactive = new ActiveElementData('inactive', false);

  private constructor(
    public readonly name: string,
    public readonly value: boolean,
  ) {}

  public static getFromName(name: string): ActiveElementData | undefined {
    return (Object.values(this) as ActiveElementData[]).find(
      (n) => n.name === name,
    );
  }

  public static getFromValue(value: boolean): ActiveElementData | undefined {
    return (Object.values(this) as ActiveElementData[]).find(
      (n) => n.value === value,
    );
  }
}
