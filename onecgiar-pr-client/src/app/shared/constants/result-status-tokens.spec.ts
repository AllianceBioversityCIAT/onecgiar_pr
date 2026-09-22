import {
  RESULT_STATUS_LABELS,
  RESULT_STATUS_TOKENS,
  resultStatusBg,
  resultStatusFg,
  resultStatusLabel,
  resultStatusToken
} from './result-status-tokens';

describe('result-status-tokens', () => {
  it('maps Editing to the in-progress pair', () => {
    expect(resultStatusFg(1)).toBe('var(--pr-status-in-progress-fg)');
    expect(resultStatusBg(1)).toBe('var(--pr-status-in-progress-bg)');
  });

  it('maps Quality Assessed to the in-qa pair', () => {
    expect(resultStatusFg(2)).toBe('var(--pr-status-in-qa-fg)');
    expect(resultStatusBg(2)).toBe('var(--pr-status-in-qa-bg)');
  });

  it('maps Submitted to the submitted pair', () => {
    expect(resultStatusFg(3)).toBe('var(--pr-status-submitted-fg)');
    expect(resultStatusBg(3)).toBe('var(--pr-status-submitted-bg)');
  });

  // P2-3553 — grey meant "inactive / disabled" on a result that is mid-flight. Pending review sits
  // on the same rung as Submitted, so it shares that pair. The lock below is the point of the test:
  // it must NOT be the grey one, and it must NOT be Editing's amber (those two would be
  // indistinguishable in the Results Center, where both statuses share a column).
  it('maps Pending review to the submitted pair, never to grey or to Editing amber', () => {
    expect(resultStatusFg(5)).toBe('var(--pr-status-submitted-fg)');
    expect(resultStatusBg(5)).toBe('var(--pr-status-submitted-bg)');
    expect(resultStatusBg(5)).not.toBe('var(--pr-status-not-started-bg)');
    expect(resultStatusBg(5)).not.toBe(resultStatusBg(1));
  });

  it('maps Approved and Rejected to their dedicated pairs', () => {
    expect(resultStatusFg(6)).toBe('var(--pr-status-approved-fg)');
    expect(resultStatusBg(6)).toBe('var(--pr-status-approved-bg)');
    expect(resultStatusFg(7)).toBe('var(--pr-status-rejected-fg)');
    expect(resultStatusBg(7)).toBe('var(--pr-status-rejected-bg)');
  });

  it('falls back to not-started for unknown ids', () => {
    expect(resultStatusToken(99)).toEqual({
      fg: 'var(--pr-status-not-started-fg)',
      bg: 'var(--pr-status-not-started-bg)'
    });
    expect(resultStatusToken(null)).toEqual(resultStatusToken(99));
  });

  it('covers every declared status id', () => {
    expect(Object.keys(RESULT_STATUS_TOKENS).map(Number).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('names every status it colours', () => {
    expect(Object.keys(RESULT_STATUS_LABELS).map(Number).sort()).toEqual(
      Object.keys(RESULT_STATUS_TOKENS).map(Number).sort()
    );
    expect(resultStatusLabel(2)).toBe('Quality Assessed');
    expect(resultStatusLabel(5)).toBe('Pending review');
    expect(resultStatusLabel(99)).toBe('');
    expect(resultStatusLabel(null)).toBe('');
  });

  // The bug this file now guards (Cami, 21-Sep-2026): the result-detail rail carried a private map
  // that painted Quality Assessed with the APPROVED green and had no entry for Approved at all.
  // Two different statuses cannot answer with the same pair, or a reporter reads one as the other.
  it('gives Quality Assessed and Approved pairs that cannot be confused', () => {
    expect(resultStatusToken(2)).not.toEqual(resultStatusToken(6));
    expect(resultStatusFg(2)).not.toBe('var(--pr-status-approved-fg)');
    expect(resultStatusToken(6)).not.toEqual(resultStatusToken(99));
  });
});
