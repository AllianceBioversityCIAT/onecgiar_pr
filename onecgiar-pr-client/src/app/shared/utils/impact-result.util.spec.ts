import { isP25ImpactResult, principalImpactAreaNames, resultTypeDisplayName } from './impact-result.util';

describe('isP25ImpactResult', () => {
  it('is true only for type 9 in P25', () => {
    expect(isP25ImpactResult({ result_type_id: 9, portfolio: 'P25' })).toBe(true);
    expect(isP25ImpactResult({ result_type_id: 9, portfolio: 'p25' })).toBe(true);
  });
  it('is false for type 9 in P22 and for other types in P25', () => {
    expect(isP25ImpactResult({ result_type_id: 9, portfolio: 'P22' })).toBe(false);
    expect(isP25ImpactResult({ result_type_id: 1, portfolio: 'P25' })).toBe(false);
  });
  it('is false for null/empty results', () => {
    expect(isP25ImpactResult(null)).toBe(false);
    expect(isP25ImpactResult({})).toBe(false);
  });
});

describe('resultTypeDisplayName', () => {
  it('renames type 9 only', () => {
    expect(resultTypeDisplayName(9, 'Impact contribution')).toBe('Impact result');
    expect(resultTypeDisplayName('9', 'Impact contribution')).toBe('Impact result');
    expect(resultTypeDisplayName(1, 'Policy change')).toBe('Policy change');
    expect(resultTypeDisplayName(6, 'Knowledge product')).toBe('Knowledge product');
    expect(resultTypeDisplayName(null, 'X')).toBe('X');
    expect(resultTypeDisplayName(1, null)).toBe('');
  });
});

describe('principalImpactAreaNames', () => {
  it('returns [] when no area is Principal', () => {
    expect(principalImpactAreaNames({})).toEqual([]);
    expect(principalImpactAreaNames({ gender_tag_level_id: '2', poverty_tag_level_id: '1' })).toEqual([]);
  });
  it('returns one name for one Principal area', () => {
    expect(principalImpactAreaNames({ gender_tag_level_id: '3', poverty_tag_level_id: '2' })).toEqual(['Gender Equality, Youth and Social Inclusion']);
  });
  it('returns two names in impact-area id order, accepting numeric ids', () => {
    expect(principalImpactAreaNames({ climate_change_tag_level_id: 3 as any, nutrition_tag_level_id: '3' })).toEqual([
      'Nutrition, Health and Food Security',
      'Climate Adaptation and Mitigation'
    ]);
  });
  it('maps every column to its area', () => {
    expect(
      principalImpactAreaNames({
        nutrition_tag_level_id: '3',
        poverty_tag_level_id: '3',
        gender_tag_level_id: '3',
        climate_change_tag_level_id: '3',
        environmental_biodiversity_tag_level_id: '3'
      })
    ).toHaveLength(5);
  });
});
