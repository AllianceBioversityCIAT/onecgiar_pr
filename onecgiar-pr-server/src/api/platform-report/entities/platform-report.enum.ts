export class PlatformReportEnum {
  public static readonly FULL_RESULT_REPORT = new PlatformReportEnum(
    1,
    'Full Result Report',
    { header_name: 'frt_header', footer_name: 'frt_footer' },
  );
  public static readonly FULL_IPSR_REPORT = new PlatformReportEnum(
    2,
    'Full IPSR Report',
    { header_name: 'frt_header', footer_name: 'frt_footer' },
  );

  private constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly children: HeaderFooter,
  ) {}

  public static getfromId(id: number): PlatformReportEnum | undefined {
    return (Object.values(this) as PlatformReportEnum[]).find(
      (p) => p.id === id,
    );
  }

  public static getfromName(name: string): PlatformReportEnum | undefined {
    return (Object.values(this) as PlatformReportEnum[]).find(
      (p) => p.name === name,
    );
  }
}

interface HeaderFooter {
  header_name: string;
  footer_name: string;
}
