// @akili-spec results/impact-results-reporting/sp-reporting-entry
// IRE-DD-2: the five CGIAR impact areas (CLARISA ids 1..5) with their icon asset.
export interface ImpactArea {
  id: number;
  name: string;
  icon: string;
}

export const IMPACT_AREAS: ImpactArea[] = [
  { id: 1, name: 'Nutrition, Health and Food Security', icon: 'assets/impact_areas/1.png' },
  { id: 2, name: 'Poverty Reduction, Livelihoods and Jobs', icon: 'assets/impact_areas/2.png' },
  { id: 3, name: 'Gender Equality, Youth and Social Inclusion', icon: 'assets/impact_areas/3.png' },
  { id: 4, name: 'Climate Adaptation and Mitigation', icon: 'assets/impact_areas/4.png' },
  { id: 5, name: 'Environmental Health and Biodiversity', icon: 'assets/impact_areas/5.png' }
];
