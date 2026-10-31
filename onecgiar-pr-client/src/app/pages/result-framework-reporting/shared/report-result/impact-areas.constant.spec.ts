import { IMPACT_AREAS } from './impact-areas.constant';

describe('IMPACT_AREAS', () => {
  it('lists the five areas in id order 1..5 with their icon paths', () => {
    expect(IMPACT_AREAS.map(a => a.id)).toEqual([1, 2, 3, 4, 5]);
    expect(IMPACT_AREAS.map(a => a.icon)).toEqual([1, 2, 3, 4, 5].map(id => `assets/impact_areas/${id}.png`));
  });

  it('uses the exact CLARISA names', () => {
    expect(IMPACT_AREAS.map(a => a.name)).toEqual([
      'Nutrition, Health and Food Security',
      'Poverty Reduction, Livelihoods and Jobs',
      'Gender Equality, Youth and Social Inclusion',
      'Climate Adaptation and Mitigation',
      'Environmental Health and Biodiversity'
    ]);
  });
});
