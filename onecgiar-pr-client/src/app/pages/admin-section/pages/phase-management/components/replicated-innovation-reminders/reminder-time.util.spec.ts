// @akili-spec changes/replicated-innovation-reminders (RIR-T-6, RIR-R-5)
import { localInputToUtcIso, offsetLabel, utcIsoToLocalInput } from './reminder-time.util';

describe('reminder-time.util', () => {
  it('converts a local 08:00 in UTC-5 (offset 300) to 13:00Z', () => {
    expect(localInputToUtcIso('2026-11-15T08:00', () => 300)).toBe('2026-11-15T13:00:00.000Z');
  });

  it('converts a local time east of UTC (offset -120) backwards', () => {
    expect(localInputToUtcIso('2026-11-15T08:00', () => -120)).toBe('2026-11-15T06:00:00.000Z');
  });

  it('rolls the date over when the offset crosses midnight', () => {
    expect(localInputToUtcIso('2026-11-15T22:30', () => 300)).toBe('2026-11-16T03:30:00.000Z');
  });

  it('returns null for an unparseable value', () => {
    expect(localInputToUtcIso('', () => 300)).toBeNull();
    expect(localInputToUtcIso('garbage', () => 300)).toBeNull();
  });

  it('round-trips through utcIsoToLocalInput', () => {
    const iso = localInputToUtcIso('2026-11-15T08:00', () => 300) as string;
    expect(utcIsoToLocalInput(iso, () => 300)).toBe('2026-11-15T08:00');
  });

  it('labels the offset with an explicit sign', () => {
    expect(offsetLabel(300)).toBe('UTC-05:00');
    expect(offsetLabel(-330)).toBe('UTC+05:30');
    expect(offsetLabel(0)).toBe('UTC+00:00');
  });

  describe('across a DST boundary (Rome: UTC+2 until 2026-10-25T01:00Z, UTC+1 after)', () => {
    const rome = (at: Date) => (at.getTime() < Date.parse('2026-10-25T01:00:00Z') ? -120 : -60);

    it('uses the offset of the entered date, not of today', () => {
      expect(localInputToUtcIso('2026-10-19T09:00', rome)).toBe('2026-10-19T07:00:00.000Z');
      expect(localInputToUtcIso('2026-11-15T09:00', rome)).toBe('2026-11-15T08:00:00.000Z');
    });

    it('round-trips a winter date through the prefill conversion', () => {
      expect(utcIsoToLocalInput('2026-11-15T08:00:00.000Z', rome)).toBe('2026-11-15T09:00');
      expect(utcIsoToLocalInput('2026-10-19T07:00:00.000Z', rome)).toBe('2026-10-19T09:00');
    });
  });
});
