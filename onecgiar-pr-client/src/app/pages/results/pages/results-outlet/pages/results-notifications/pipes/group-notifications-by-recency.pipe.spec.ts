import { GroupNotificationsByRecencyPipe } from './group-notifications-by-recency.pipe';

describe('GroupNotificationsByRecencyPipe', () => {
  let pipe: GroupNotificationsByRecencyPipe;

  beforeEach(() => {
    pipe = new GroupNotificationsByRecencyPipe();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('buckets today/this-week/earlier rows in that order for a fixed clock', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-25T10:00:00Z').getTime());

    const todayRow = { requested_date: '2026-09-25T09:00:00Z' };
    const thisWeekRow = { requested_date: '2026-09-22T10:00:00Z' };
    const earlierRow = { requested_date: '2026-08-01T10:00:00Z' };

    const result = pipe.transform([todayRow, thisWeekRow, earlierRow]);

    expect(result).toEqual({
      today: [todayRow],
      thisWeek: [thisWeekRow],
      earlier: [earlierRow]
    });
  });

  it('returns empty buckets for an empty list', () => {
    const result = pipe.transform([]);

    expect(result).toEqual({ today: [], thisWeek: [], earlier: [] });
  });

  it('returns empty buckets for a null/undefined list', () => {
    expect(pipe.transform(null as unknown as unknown[])).toEqual({ today: [], thisWeek: [], earlier: [] });
    expect(pipe.transform(undefined as unknown as unknown[])).toEqual({ today: [], thisWeek: [], earlier: [] });
  });

  it('buckets a single-item list correctly', () => {
    const fixedNow = new Date('2026-09-25T10:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const onlyRow = { requested_date: new Date(fixedNow - 1000).toISOString() };

    const result = pipe.transform([onlyRow]);

    expect(result).toEqual({ today: [onlyRow], thisWeek: [], earlier: [] });
  });

  it('falls back to the "earlier" bucket for a row with no date, per NOTIF-P-1 fallback (not silently dropped)', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-25T10:00:00Z').getTime());

    const noDateRow = { requested_date: undefined } as { requested_date?: string };

    const result = pipe.transform([noDateRow]);

    expect(result).toEqual({ today: [], thisWeek: [], earlier: [noDateRow] });
  });

  it('respects a custom dateKey', () => {
    const fixedNow = new Date('2026-09-25T10:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const row = { alt_date: new Date(fixedNow - 1000).toISOString() };

    const result = pipe.transform([row], 'alt_date');

    expect(result).toEqual({ today: [row], thisWeek: [], earlier: [] });
  });

  it('places a row at exact local midnight of today in the today bucket', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-25T10:00:00Z').getTime());

    const now = new Date(Date.now());
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const row = { requested_date: startOfToday.toISOString() };

    const result = pipe.transform([row]);

    expect(result.today).toEqual([row]);
  });

  it('places a row one millisecond before local midnight of today in the this-week bucket', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-25T10:00:00Z').getTime());

    const now = new Date(Date.now());
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const justBeforeToday = new Date(startOfToday.getTime() - 1);
    const row = { requested_date: justBeforeToday.toISOString() };

    const result = pipe.transform([row]);

    expect(result.thisWeek).toEqual([row]);
  });

  it('places a row exactly 7 days before local midnight of today in the this-week bucket (inclusive lower boundary)', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-25T10:00:00Z').getTime());

    const now = new Date(Date.now());
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const row = { requested_date: startOfWeek.toISOString() };

    const result = pipe.transform([row]);

    expect(result.thisWeek).toEqual([row]);
  });

  it('places a row one millisecond before the this-week boundary in the earlier bucket', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-25T10:00:00Z').getTime());

    const now = new Date(Date.now());
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const justBeforeWeek = new Date(startOfWeek.getTime() - 1);
    const row = { requested_date: justBeforeWeek.toISOString() };

    const result = pipe.transform([row]);

    expect(result.earlier).toEqual([row]);
  });

  it('preserves already-sorted (requested_date desc) order within each bucket, no re-sort', () => {
    const fixedNow = new Date('2026-09-25T10:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const newerToday = { requested_date: new Date(fixedNow - 1000).toISOString() };
    const olderToday = { requested_date: new Date(fixedNow - 2000).toISOString() };

    const result = pipe.transform([newerToday, olderToday]);

    expect(result.today).toEqual([newerToday, olderToday]);
  });

  it('sorts a bucket newer-first when a pending-older row and a done-newer row arrive out of order (NOTIF-T-5 attempt-2 fix: pipe re-sorts, robust to a piecewise-sorted merge)', () => {
    const fixedNow = new Date('2026-09-25T10:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const pendingOlder = { requested_date: new Date(fixedNow - 5000).toISOString(), request_status_id: 1 };
    const doneNewer = { requested_date: new Date(fixedNow - 1000).toISOString(), request_status_id: 2 };

    // Input arrives piecewise-sorted (pending block, then done block) — as a plain .concat() of two
    // independently-sorted arrays would produce — not globally desc-sorted.
    const result = pipe.transform([pendingOlder, doneNewer]);

    expect(result.today).toEqual([doneNewer, pendingOlder]);
  });
});
