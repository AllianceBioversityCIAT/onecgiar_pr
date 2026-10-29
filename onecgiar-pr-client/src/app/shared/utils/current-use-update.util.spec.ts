import {
  currentUseMismatchMessage,
  currentUseMismatchReason,
  hasCurrentUseMismatch,
  isCurrentUseUpdateAnswered,
  isCurrentUseUpdateComplete,
  previousReportedUse,
  previousUsePhaseYear,
  totalCumulativeUse
} from './current-use-update.util';

/** P2-3985 — the Current Use Update rules shared by the W1/W2 and the W3/bilateral forms. */
describe('current-use-update util', () => {
  const previous = { total_actors: 500, phase_year: 2025 };

  it('reads the previous figure and its phase year, tolerating missing data', () => {
    expect(previousReportedUse(previous)).toBe(500);
    expect(previousReportedUse(null)).toBe(0);
    expect(previousUsePhaseYear(previous)).toBe(2025);
    expect(previousUsePhaseYear({ phase_year: null })).toBeNull();
    expect(previousUsePhaseYear({ phase_year: 0 })).toBeNull();
  });

  it('computes the cumulative total and the mismatch', () => {
    expect(totalCumulativeUse(previous, 20)).toBe(520);
    expect(totalCumulativeUse(previous, null)).toBe(500);
    expect(hasCurrentUseMismatch(520, previous, 20)).toBe(false);
    expect(hasCurrentUseMismatch(530, previous, 20)).toBe(true);
  });

  it('names the exact gap and its direction', () => {
    expect(currentUseMismatchMessage(530, previous, 20)).toBe(
      'The user categories add up to 530, which is 10 more than the total cumulative use of 520 (500 previously reported + 20 added this period). Adjust the categories or the number of new users.'
    );
    expect(currentUseMismatchReason(510, previous, 20)).toBe('the user categories add up to 510, 10 fewer than the total cumulative use of 520');
  });

  it('a 0 is an answer, but it still needs the narrative', () => {
    expect(isCurrentUseUpdateAnswered(0, 'verified')).toBe(true);
    expect(isCurrentUseUpdateAnswered(0, '   ')).toBe(false);
    expect(isCurrentUseUpdateAnswered(null, 'x')).toBe(false);
    expect(isCurrentUseUpdateComplete(500, previous, 0, 'verified')).toBe(true);
    expect(isCurrentUseUpdateComplete(499, previous, 0, 'verified')).toBe(false);
  });
});
