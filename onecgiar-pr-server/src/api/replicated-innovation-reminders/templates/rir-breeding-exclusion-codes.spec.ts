// @akili-spec changes/rir-breeding-exclusion
// RBX-T-1 (c): the 114 codes of the sheet "Results excluded from notification" (2026-11-25).
import {
  RIR_BREEDING_EXCLUSION_CODES,
  RIR_BREEDING_EXCLUSION_REASON,
} from './rir-breeding-exclusion-codes';

describe('rir-breeding-exclusion-codes', () => {
  // Literal copies from the sheet, independent of the module under test.
  const SHEET_FIRST = 26541;
  const SHEET_LAST = 28704;
  const SHEET_BOUNDARIES = [17, 347, 14855];
  const SHEET_COUNT = 114;
  const SHEET_SUM = 2109948;

  it('holds 114 codes', () => {
    expect(RIR_BREEDING_EXCLUSION_CODES).toHaveLength(SHEET_COUNT);
  });

  it('all codes are distinct positive integers', () => {
    expect(new Set(RIR_BREEDING_EXCLUSION_CODES).size).toBe(SHEET_COUNT);
    for (const code of RIR_BREEDING_EXCLUSION_CODES) {
      expect(Number.isInteger(code)).toBe(true);
      expect(code).toBeGreaterThan(0);
    }
  });

  it('starts and ends like the sheet and holds its boundary codes', () => {
    expect(RIR_BREEDING_EXCLUSION_CODES[0]).toBe(SHEET_FIRST);
    expect(RIR_BREEDING_EXCLUSION_CODES[SHEET_COUNT - 1]).toBe(SHEET_LAST);
    expect(RIR_BREEDING_EXCLUSION_CODES).toEqual(
      expect.arrayContaining([SHEET_FIRST, SHEET_LAST, ...SHEET_BOUNDARIES]),
    );
  });

  it('keeps 28595: it is on the sheet even though that result already left Editing', () => {
    expect(RIR_BREEDING_EXCLUSION_CODES).toContain(28595);
  });

  it('matches the checksum of the sheet list', () => {
    const sum = RIR_BREEDING_EXCLUSION_CODES.reduce((a, b) => a + b, 0);
    expect(sum).toBe(SHEET_SUM);
  });

  it('carries the SR-167303 reason (design section 4)', () => {
    expect(RIR_BREEDING_EXCLUSION_REASON).toBe(
      'SR-167303: SP01 breeding line/variety updated by B4T (list of 2026-11-25)',
    );
    expect(RIR_BREEDING_EXCLUSION_REASON.length).toBeLessThanOrEqual(255);
  });
});
