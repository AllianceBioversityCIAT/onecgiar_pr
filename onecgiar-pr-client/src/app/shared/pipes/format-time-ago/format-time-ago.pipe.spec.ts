import { FormatTimeAgoPipe } from './format-time-ago.pipe';

describe('FormatTimeAgoPipe', () => {
  let pipe: FormatTimeAgoPipe;

  beforeEach(() => {
    pipe = new FormatTimeAgoPipe();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "seconds ago" for less than a minute', () => {
    const date = new Date('2022-12-31T23:59:30Z');
    expect(pipe.transform(date)).toBe('30 seconds ago');
  });

  it('should return "minutes ago" for less than an hour', () => {
    const date = new Date('2022-12-31T23:30:00Z');
    expect(pipe.transform(date)).toBe('30 minutes ago');
  });

  it('should return "hours ago" for less than a day', () => {
    const date = new Date('2022-12-31T20:00:00Z');
    expect(pipe.transform(date)).toBe('4 hours ago');
  });

  it('should return "days ago" for less than a month', () => {
    const date = new Date('2022-12-25T00:00:00Z');
    expect(pipe.transform(date)).toBe('7 days ago');
  });

  it('should return "months ago" for less than a year', () => {
    const date = new Date('2022-10-01T00:00:00Z');
    expect(pipe.transform(date)).toBe('3 months ago');
  });

  it('should return "years ago" for more than a year', () => {
    const date = new Date('2021-01-01T00:00:00Z');
    expect(pipe.transform(date)).toBe('2 years ago');
  });

  it('should handle string input', () => {
    expect(pipe.transform('2022-12-31T23:59:30Z')).toBe('30 seconds ago');
  });

  it('should handle number input (timestamp)', () => {
    const timestamp = new Date('2022-12-31T23:59:30Z').getTime();
    expect(pipe.transform(timestamp)).toBe('30 seconds ago');
  });
});
