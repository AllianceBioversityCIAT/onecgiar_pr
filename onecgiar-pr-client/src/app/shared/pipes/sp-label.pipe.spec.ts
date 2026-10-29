import { SpLabelPipe } from './sp-label.pipe';

describe('SpLabelPipe', () => {
  const pipe = new SpLabelPipe();

  it('composes code and name with the fallback order name -> initiative_name -> short_name', () => {
    expect(pipe.transform({ official_code: 'SP10', name: null, initiative_name: undefined, short_name: 'GEI' })).toBe('SP10 - GEI');
    expect(pipe.transform({ official_code: 'SP01', name: 'A', initiative_name: 'B', short_name: 'C' })).toBe('SP01 - A');
  });

  it('returns only the code when no name is available', () => {
    expect(pipe.transform({ official_code: 'SP04', name: '  ' })).toBe('SP04');
  });

  it('returns empty string for null/undefined input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
