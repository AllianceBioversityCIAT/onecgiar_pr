import { resolveInitialStatusId } from './initial-status.constants';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';

/**
 * P2-3428. The flag decides whether an ingested result joins the review queue immediately or
 * lands in the centre's form first, so the table below is the contract Daniel's platform codes
 * its checkbox against — an accidental flip here is a silent behaviour change for every producer.
 */
describe('resolveInitialStatusId', () => {
  it('defaults to Pending Review when keep_editing is absent', () => {
    expect(resolveInitialStatusId({})).toBe(
      ResultStatusData.PendingReview.value,
    );
  });

  it('keeps Pending Review when keep_editing is false', () => {
    expect(resolveInitialStatusId({ keep_editing: false })).toBe(
      ResultStatusData.PendingReview.value,
    );
  });

  it('returns Editing when keep_editing is true', () => {
    expect(resolveInitialStatusId({ keep_editing: true })).toBe(
      ResultStatusData.Editing.value,
    );
  });

  it('survives a null dto without throwing', () => {
    expect(resolveInitialStatusId(null as any)).toBe(
      ResultStatusData.PendingReview.value,
    );
  });

  /**
   * The DTO's `@IsBoolean()` rejects these before the service ever runs, so this is a second
   * line of defence rather than a supported input: a truthy string must NOT open the Editing
   * path, because "false" is truthy and would invert the caller's intent.
   */
  it.each([['true'], ['false'], [1], [0], ['']])(
    'treats the non-boolean %p as Pending Review',
    (value) => {
      expect(resolveInitialStatusId({ keep_editing: value } as any)).toBe(
        ResultStatusData.PendingReview.value,
      );
    },
  );
});
