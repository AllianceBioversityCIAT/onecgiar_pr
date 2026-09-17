import {
  RESULT_STATUS_TOKENS,
  resultStatusBg,
  resultStatusFg,
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

  it('maps Pending review to the not-started pair', () => {
    expect(resultStatusFg(5)).toBe('var(--pr-status-not-started-fg)');
    expect(resultStatusBg(5)).toBe('var(--pr-status-not-started-bg)');
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
});
