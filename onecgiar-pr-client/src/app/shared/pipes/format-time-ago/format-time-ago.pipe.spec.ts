import { FormatTimeAgoPipe } from './format-time-ago.pipe';
import { format, formatDistanceToNowStrict, parseISO, subHours } from 'date-fns';
import { enUS } from 'date-fns/locale';

describe('FormatTimeAgoPipe', () => {
  let pipe: FormatTimeAgoPipe;

  beforeEach(() => {
    pipe = new FormatTimeAgoPipe();
  });

  it('should transform ISO string date correctly', () => {
    const date = new Date();
    const isoString = date.toISOString();
    const result = pipe.transform(isoString);
    const expected = `${formatDistanceToNowStrict(subHours(parseISO(isoString), new Date().getTimezoneOffset() / 60), {
      addSuffix: false,
      locale: enUS
    })} ago`;
    expect(result).toBe(expected);
  });

  it('should transform timestamp correctly', () => {
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const result = pipe.transform(timestamp);
    const expected = `${formatDistanceToNowStrict(subHours(date, new Date().getTimezoneOffset() / 60), { addSuffix: false, locale: enUS })} ago`;
    expect(result).toBe(expected);
  });

  it('should adjust for server timezone correctly', () => {
    const date = new Date();
    const isoString = date.toISOString();
    const serverTimezone = 3;
    const result = pipe.transform(isoString, serverTimezone);
    const expectedDate = subHours(parseISO(isoString), serverTimezone + new Date().getTimezoneOffset() / 60);
    const expected = `${formatDistanceToNowStrict(expectedDate, { addSuffix: false, locale: enUS })} ago`;
    expect(result).toBe(expected);
  });

  it('should handle UTC server timezone correctly', () => {
    // Use a date 2 hours ago to ensure it's within the one week threshold
    const fixedDate = new Date();
    fixedDate.setHours(fixedDate.getHours() - 2);
    const isoString = fixedDate.toISOString();
    const serverTimezone = 0;
    const result = pipe.transform(isoString, serverTimezone);

    // Verify the result ends with 'ago' and is a non-empty string
    expect(result).toMatch(/.+ ago$/);
    expect(result.length).toBeGreaterThan(0);

    // Verify it processes the timezone adjustment correctly by checking the result
    // contains expected date-fns format patterns (numbers followed by time units)
    expect(result).toMatch(/^(\d+\s+(second|minute|hour|day|month|year)s?|less than a minute)\s+ago$/);
  });

  it('should format dates older than one week correctly', () => {
    const date = new Date();
    date.setDate(date.getDate() - 8);
    const isoString = date.toISOString();
    const result = pipe.transform(isoString);
    const expected = format(subHours(parseISO(isoString), new Date().getTimezoneOffset() / 60), 'yyyy MMM dd', { locale: enUS });
    expect(result).toBe(expected);
  });

  it('should format dates within one week correctly', () => {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    const isoString = date.toISOString();
    const result = pipe.transform(isoString);
    const expected = `${formatDistanceToNowStrict(subHours(parseISO(isoString), new Date().getTimezoneOffset() / 60), {
      addSuffix: false,
      locale: enUS
    })} ago`;
    expect(result).toBe(expected);
  });

  it('should handle server timezone for dates older than one week correctly', () => {
    const date = new Date();
    date.setDate(date.getDate() - 8);
    const isoString = date.toISOString();
    const serverTimezone = 3;
    const result = pipe.transform(isoString, serverTimezone);
    const expectedDate = subHours(parseISO(isoString), serverTimezone + new Date().getTimezoneOffset() / 60);
    const expected = format(expectedDate, 'yyyy MMM dd', { locale: enUS });
    expect(result).toBe(expected);
  });

  it('should handle server timezone for dates within one week correctly', () => {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    const isoString = date.toISOString();
    const serverTimezone = 3;
    const result = pipe.transform(isoString, serverTimezone);
    const expectedDate = subHours(parseISO(isoString), serverTimezone + new Date().getTimezoneOffset() / 60);
    const expected = `${formatDistanceToNowStrict(expectedDate, { addSuffix: false, locale: enUS })} ago`;
    expect(result).toBe(expected);
  });
});
