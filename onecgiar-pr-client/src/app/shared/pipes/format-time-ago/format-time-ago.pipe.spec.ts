import { FormatTimeAgoPipe } from './format-time-ago.pipe';
import { formatDistanceToNowStrict, parseISO, subHours } from 'date-fns';
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

  it('should transform Date object correctly', () => {
    const date = new Date();
    const result = pipe.transform(date);
    const expected = `${formatDistanceToNowStrict(subHours(date, new Date().getTimezoneOffset() / 60), { addSuffix: false, locale: enUS })} ago`;
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
    const date = new Date();
    const isoString = date.toISOString();
    const serverTimezone = 0;
    const result = pipe.transform(isoString, serverTimezone);
    const expected = `${formatDistanceToNowStrict(subHours(parseISO(isoString), new Date().getTimezoneOffset() / 60), {
      addSuffix: false,
      locale: enUS
    })} ago`;
    expect(result).toBe(expected);
  });
});
