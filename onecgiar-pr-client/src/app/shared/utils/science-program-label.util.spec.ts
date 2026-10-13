import { scienceProgramLabel, withScienceProgramLabel } from './science-program-label.util';

describe('scienceProgramLabel', () => {
  it('skips null/undefined candidates and uses the first usable name', () => {
    expect(scienceProgramLabel('SP10', null, undefined, 'GEI')).toBe('SP10 - GEI');
  });

  it('prefers the earlier candidate', () => {
    expect(scienceProgramLabel('SP01', 'Name', 'Initiative', 'Short')).toBe('SP01 - Name');
  });

  it('treats whitespace-only names as missing', () => {
    expect(scienceProgramLabel('SP10', '  ')).toBe('SP10');
    expect(scienceProgramLabel('SP10', '  ', 'Real')).toBe('SP10 - Real');
  });

  it('returns only the name when the code is missing', () => {
    expect(scienceProgramLabel(null, 'X')).toBe('X');
  });

  it('returns empty string when nothing is usable', () => {
    expect(scienceProgramLabel(undefined)).toBe('');
    expect(scienceProgramLabel('', ' ', null)).toBe('');
  });

  it('never leaks undefined/null text or a trailing separator', () => {
    const outputs = [
      scienceProgramLabel('SP10', null, undefined),
      scienceProgramLabel(undefined, undefined),
      scienceProgramLabel(null, null),
      scienceProgramLabel('SP10', '')
    ];
    outputs.forEach(out => {
      expect(out).not.toContain('undefined');
      expect(out).not.toContain('null');
      expect(out.endsWith(' - ')).toBe(false);
    });
  });
});

describe('withScienceProgramLabel', () => {
  it('adds sp_label and keeps the original fields', () => {
    expect(withScienceProgramLabel({ official_code: 'SP02', initiative_name: 'Nutrition' })).toEqual({
      official_code: 'SP02',
      initiative_name: 'Nutrition',
      sp_label: 'SP02 - Nutrition'
    });
  });
});
