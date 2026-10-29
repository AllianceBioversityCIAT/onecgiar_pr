// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-10 / known gap 17: expected values are the scenario's (stored 2 -> { value: 4, degree: 2 }), not recomputed.
import { NORMALIZERS, normalize } from './normalizers';

const KEY = 'capacity_sharing.length_of_training';
const typed = (raw: unknown) => ({ value: raw, degree: raw });

describe('normalize', () => {
  it.each([
    [1, { value: 4, degree: 1 }],
    [2, { value: 4, degree: 2 }],
    [3, { value: 3, degree: null }],
    [4, { value: 4, degree: null }],
    [null, { value: null, degree: null }],
  ])('stored %p -> %p', (raw, expected) => {
    expect(normalize(KEY, typed(raw))).toEqual(expected);
  });

  it('an id that arrives as a string is read the same', () => {
    expect(normalize(KEY, typed('2'))).toEqual({ value: 4, degree: 2 });
  });

  it('is a closed list: that key only, any other value passes through', () => {
    expect(Object.keys(NORMALIZERS)).toEqual([KEY]);
    expect(normalize('general.title', 'x')).toBe('x');
  });
});
