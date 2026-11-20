import { isResultLockedByQaReview } from './qa-review-lock.util';

describe('isResultLockedByQaReview', () => {
  it.each([
    [{ inQA: 1, is_phase_open: 1 }, true],
    [{ inQA: '1', is_phase_open: '1' }, true],
    [{ inQA: true, is_phase_open: 1 }, true],
    [{ inQA: 0, is_phase_open: 1 }, false],
    [{ inQA: null, is_phase_open: 1 }, false],
    [{ inQA: 1, is_phase_open: 0 }, false],
    [null, false],
    [undefined, false]
  ])('%j -> %s', (row, expected) => {
    expect(isResultLockedByQaReview(row as any)).toBe(expected);
  });
});
