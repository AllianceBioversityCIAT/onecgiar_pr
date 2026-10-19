import { buildQuickTypologyChips } from './reporting-quick-typology.util';

describe('buildQuickTypologyChips', () => {
  it('first chip is KPI, reads counts.all and is active with no category selected (DKT-R-3)', () => {
    const [first] = buildQuickTypologyChips([], { all: 42 }, 7);
    expect(first).toMatchObject({ label: 'KPI', shortLabel: 'KPI', count: 42, active: true });
  });
});
