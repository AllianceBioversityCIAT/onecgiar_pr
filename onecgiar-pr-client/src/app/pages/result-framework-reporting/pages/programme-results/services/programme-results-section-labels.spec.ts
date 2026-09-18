import { sectionLabel } from './programme-results-section-labels';

describe('programme-results-section-labels (EMG-T-2)', () => {
  it('returns Emerging for UNTAGGED when plannedResult is exactly 0', () => {
    expect(sectionLabel('UNTAGGED', 0)).toBe('Emerging');
  });

  it('returns Not tagged for UNTAGGED when plannedResult is 1', () => {
    expect(sectionLabel('UNTAGGED', 1)).toBe('Not tagged');
  });

  it('returns Not tagged for UNTAGGED when plannedResult is null or absent', () => {
    expect(sectionLabel('UNTAGGED', null)).toBe('Not tagged');
    expect(sectionLabel('UNTAGGED')).toBe('Not tagged');
  });

  it('does not relabel non-UNTAGGED keys', () => {
    expect(sectionLabel('INTERMEDIATE', 0)).toBe('Intermediate outcomes');
  });
});
