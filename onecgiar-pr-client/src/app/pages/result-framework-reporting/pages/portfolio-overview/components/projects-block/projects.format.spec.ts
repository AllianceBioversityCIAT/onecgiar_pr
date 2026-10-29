import { ProjectsByCenter, ProjectsByProgram } from '../../../../../../shared/interfaces/portfolio-bilateral-projects.interface';
import { footnoteText, shareOfMapped, toCenterRows, toProgramRows } from './projects.format';

const counts = { mapped: 1, withBilateralResults: 0, w1w2Contributors: 0 };
const prog = (code: string): ProjectsByProgram => ({ code, shortName: code, name: `Name ${code}`, ...counts });
const center = (code: string | null, acronym: string | null, mapped = 1): ProjectsByCenter => ({ code, acronym, name: null, ...counts, mapped });

describe('projects.format (WPS-R-8 S-8.1)', () => {
  describe('shareOfMapped', () => {
    it('30 mapped: 17 -> 56.7 and 1 -> 3.3', () => {
      expect(shareOfMapped(17, 30)).toBe('56.7');
      expect(shareOfMapped(1, 30)).toBe('3.3');
    });
    it('29 of 30 is 96.7', () => expect(shareOfMapped(29, 30)).toBe('96.7'));
    it('1 of 1000 is 0.1, never 0.0', () => expect(shareOfMapped(1, 1000)).toBe('0.1'));
    it('999 of 1000 is 99.9 and 9999 of 10000 clamps to 99.9, never 100.0', () => {
      expect(shareOfMapped(999, 1000)).toBe('99.9');
      expect(shareOfMapped(9999, 10000)).toBe('99.9');
    });
    it('equal is 100.0 and zero is 0.0', () => {
      expect(shareOfMapped(30, 30)).toBe('100.0');
      expect(shareOfMapped(0, 30)).toBe('0.0');
    });
    it('rounds half up (1 of 16 = 6.25 -> 6.3)', () => expect(shareOfMapped(1, 16)).toBe('6.3'));
    it('mapped 0 gives null, never NaN', () => expect(shareOfMapped(0, 0)).toBeNull());
  });

  describe('toProgramRows', () => {
    it('orders by natural code, SP before accelerators, never SP10 before SP09', () => {
      const rows = toProgramRows([prog('SP10'), prog('A2'), prog('SP09'), prog('SP01'), prog('A1')]);
      expect(rows.map(r => r.code)).toEqual(['SP01', 'SP09', 'SP10', 'A1', 'A2']);
    });
    it('is not ordered by figures and does not mutate the input', () => {
      const input = [{ ...prog('SP02'), mapped: 1 }, { ...prog('SP01'), mapped: 99 }];
      const rows = toProgramRows(input);
      expect(rows.map(r => r.code)).toEqual(['SP01', 'SP02']);
      expect(input[0].code).toBe('SP02');
      expect(rows[0]).toEqual(expect.objectContaining({ label: 'SP01', name: 'Name SP01', mapped: 99 }));
    });
  });

  describe('toCenterRows', () => {
    const labelFor = (code: string) => ({ 'CENTER-01': 'CIAT (Alliance)', 'CENTER-02': 'Bioversity' } as Record<string, string>)[code];
    it('labels by catalogue acronym, then institution acronym, then code; sorted A-Z, Unassigned last', () => {
      const rows = toCenterRows(
        [center(null, null, 500), center('CENTER-09', null, 50), center('CENTER-02', 'Bioversity-x', 1), center('CENTER-05', 'IRRI', 2), center('CENTER-01', 'CIAT', 9)],
        labelFor
      );
      expect(rows.map(r => r.label)).toEqual(['Bioversity', 'CENTER-09', 'CIAT (Alliance)', 'IRRI', 'Unassigned']);
      expect(rows[rows.length - 1].code).toBeNull();
    });
    it('does not order by mapped', () => {
      const rows = toCenterRows([center('CENTER-02', null, 1), center('CENTER-01', null, 100)], code => (code === 'CENTER-01' ? 'Zed' : 'Alpha'));
      expect(rows.map(r => r.label)).toEqual(['Alpha', 'Zed']);
    });
  });

  describe('footnoteText', () => {
    it('singular for 1', () => {
      expect(footnoteText(1)).toContain('1 project has');
      expect(footnoteText(1)).not.toContain('projects have');
    });
    it('plural for N', () => expect(footnoteText(3)).toContain('3 projects have'));
  });
});
