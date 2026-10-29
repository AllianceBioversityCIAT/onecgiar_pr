import { buildQuickTypologyChips } from './reporting-quick-typology.util';

describe('buildQuickTypologyChips', () => {
  it('first chip is KPI, reads counts.all and is active with no category selected (DKT-R-3)', () => {
    const [first] = buildQuickTypologyChips([], { all: 42 }, 7);
    expect(first).toMatchObject({ label: 'Total # of KPIs', shortLabel: 'KPIs', count: 42, active: true });
  });
});

/** @akili-spec changes/center-results-kpi-chips CRK-R-6 / CRK-DD-2 */
describe('buildQuickTypologyChips - hide empty chips (CRK-R-6)', () => {
  const ids = (chips: { id: string }[]) => chips.map(c => c.id);

  it('drops a zero-count category chip when nothing is selected, keeps non-zero ones and all', () => {
    const chips = buildQuickTypologyChips(
      [],
      { all: 8, 'Knowledge product': 3, 'Capacity sharing for development': 5, 'Other output': 0 },
      0
    );
    expect(ids(chips)).toEqual(['all', 'kp', 'cs']);
  });

  it('keeps a zero-count chip when it is the active selection', () => {
    const chips = buildQuickTypologyChips(['Other output'], { all: 8, 'Knowledge product': 3, 'Other output': 0 }, 0);
    expect(ids(chips)).toEqual(['all', 'kp', 'oop']);
    expect(chips.find(c => c.id === 'oop')).toMatchObject({ count: 0, active: true });
  });

  it('always keeps the Total chip, even at zero', () => {
    expect(ids(buildQuickTypologyChips([], { all: 0 }, 0))).toEqual(['all']);
    expect(ids(buildQuickTypologyChips(null, null, 0))).toEqual(['all']);
  });
});
