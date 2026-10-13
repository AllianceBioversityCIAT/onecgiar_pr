import { PT_CENTER_NAMES, toPtCenterName } from './pt-center-name';

describe('toPtCenterName', () => {
  it.each(PT_CENTER_NAMES.map((name) => [name]))(
    'passes the PT name %s through unchanged',
    (name) => {
      expect(toPtCenterName(name)).toBe(name);
    },
  );

  it('matches PT names case-insensitively and returns PT casing', () => {
    expect(toPtCenterName('worldfish')).toBe('WorldFish');
    expect(toPtCenterName('AFRICARICE')).toBe('AfricaRice');
    expect(toPtCenterName('  ifpri ')).toBe('IFPRI');
    expect(toPtCenterName('ciat (alliance)')).toBe('CIAT (Alliance)');
  });

  it.each([
    ['CIAT'],
    ['ciat'],
    ['ABC'],
    ['Alliance'],
    ['Alliance of Bioversity and CIAT'],
    ['Alliance of Bioversity International and CIAT'],
    ['CIAT-Bioversity'],
  ])('maps the Alliance/CIAT spelling %s to CIAT (Alliance)', (value) => {
    expect(toPtCenterName(value)).toBe('CIAT (Alliance)');
  });

  it.each([['Bioversity'], ['Bioversity International'], ['bioversity']])(
    'maps %s to Bioversity (Alliance)',
    (value) => {
      expect(toPtCenterName(value)).toBe('Bioversity (Alliance)');
    },
  );

  it('collapses inner whitespace before matching', () => {
    expect(toPtCenterName('Alliance  of Bioversity and   CIAT')).toBe(
      'CIAT (Alliance)',
    );
  });

  it('returns an unknown value trimmed and unchanged', () => {
    expect(toPtCenterName('  Some Partner ')).toBe('Some Partner');
  });

  it('returns an empty string for null, undefined or blank input', () => {
    expect(toPtCenterName(null)).toBe('');
    expect(toPtCenterName(undefined)).toBe('');
    expect(toPtCenterName('   ')).toBe('');
  });
});
