import { FormatTimeAgoPipe } from './format-time-ago.pipe';
import { format, formatDistanceToNowStrict, parseISO, subHours } from 'date-fns';
import { enUS } from 'date-fns/locale';

describe('FormatTimeAgoPipe', () => {
  let pipe: FormatTimeAgoPipe;

  beforeEach(() => {
    pipe = new FormatTimeAgoPipe();
  });

  it('should transform an ISO string without applying the local timezone offset', () => {
    const isoString = new Date().toISOString();
    const result = pipe.transform(isoString);
    const expected = `${formatDistanceToNowStrict(parseISO(isoString), { addSuffix: false, locale: enUS })} ago`;
    expect(result).toBe(expected);
  });

  it('should show a just-created (UTC) timestamp as near-zero, NOT shifted by the viewer offset', () => {
    // Regression for the "5 hours ago" bug: a fresh UTC instant must read as ~now
    // regardless of the viewer's timezone (e.g. must not become "5 hours ago" in UTC-5).
    const isoNow = new Date().toISOString();
    const result = pipe.transform(isoNow);
    expect(result).toBe('0 seconds ago');
  });

  it('should render a 10-minutes-ago event as "10 minutes ago"', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = pipe.transform(tenMinAgo);
    expect(result).toBe('10 minutes ago');
  });

  it('should adjust for an explicit server timezone (no local offset added)', () => {
    const isoString = new Date().toISOString();
    const serverTimezone = 3;
    const result = pipe.transform(isoString, serverTimezone);
    const expected = `${formatDistanceToNowStrict(subHours(parseISO(isoString), serverTimezone), { addSuffix: false, locale: enUS })} ago`;
    expect(result).toBe(expected);
  });

  it('should output a relative value ending in "ago" for a recent date', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = pipe.transform(twoHoursAgo);
    expect(result).toBe('2 hours ago');
    expect(result).toMatch(/^(\d+\s+(second|minute|hour|day|month|year)s?|less than a minute)\s+ago$/);
  });

  it('should format dates older than one week as an absolute date (no local offset)', () => {
    const isoString = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = pipe.transform(isoString);
    const expected = format(parseISO(isoString), 'yyyy MMM dd', { locale: enUS });
    expect(result).toBe(expected);
  });

  it('should format dates within one week as relative (no local offset)', () => {
    const isoString = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = pipe.transform(isoString);
    const expected = `${formatDistanceToNowStrict(parseISO(isoString), { addSuffix: false, locale: enUS })} ago`;
    expect(result).toBe(expected);
  });

  it('should omit the "ago" suffix when showAgo is false', () => {
    const isoString = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const result = pipe.transform(isoString, 0, false);
    expect(result.trim()).toBe(formatDistanceToNowStrict(parseISO(isoString), { addSuffix: false, locale: enUS }));
    expect(result).not.toMatch(/ago/);
  });

  it('should handle a server timezone for dates older than one week', () => {
    const isoString = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const serverTimezone = 3;
    const result = pipe.transform(isoString, serverTimezone);
    const expected = format(subHours(parseISO(isoString), serverTimezone), 'yyyy MMM dd', { locale: enUS });
    expect(result).toBe(expected);
  });
});
