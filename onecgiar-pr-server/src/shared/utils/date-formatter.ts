export class DateFormatter {
  public static readonly DEFAULT_DATE_FORMATS: Intl.DateTimeFormatOptions[] = [
    { year: 'numeric' },
    { month: '2-digit' },
    { day: '2-digit' },
  ];

  public static readonly DEFAULT_TIME_FORMATS: Intl.DateTimeFormatOptions[] = [
    { hour: '2-digit' },
    { minute: '2-digit' },
  ];

  public static readonly DEFAULT_INSTANCE = new DateFormatter();

  private constructor(
    private readonly date: Date | number = Date.now(),
    private readonly separator: string = '-',
    private readonly format: Intl.DateTimeFormatOptions[] = [
      ...DateFormatter.DEFAULT_DATE_FORMATS,
      ...DateFormatter.DEFAULT_TIME_FORMATS,
    ],
  ) {}

  public static forFilename(date: Date | number): DateForFilename {
    const dateFormatted = new DateFormatter(
      date,
      '',
      DateFormatter.DEFAULT_DATE_FORMATS,
    ).join();
    const timeFormatted = new DateFormatter(
      date,
      '',
      DateFormatter.DEFAULT_TIME_FORMATS,
    ).join();

    return { date: dateFormatted, time: timeFormatted };
  }

  private join(): string {
    function getFormat(
      format: Intl.DateTimeFormatOptions,
      date: Date | number,
    ) {
      const f = new Intl.DateTimeFormat('en-GB', format);
      return f.format(date);
    }

    return this.format.map((f) => getFormat(f, this.date)).join(this.separator);
  }
}

export interface DateForFilename {
  date: string;
  time: string;
}
