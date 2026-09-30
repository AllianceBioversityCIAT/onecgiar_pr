import { FilterNotificationByTypePipe } from './filter-notification-by-type.pipe';
import { NotificationType } from '../../../../../../../shared/constants/notification-type.constants';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../internationalization/contribution-request-drawer.copy';

describe('FilterNotificationByTypePipe', () => {
  let pipe: FilterNotificationByTypePipe;

  const CONTRIBUTION_REQUEST_LABEL = CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.contributionRequestChip;

  beforeEach(() => {
    pipe = new FilterNotificationByTypePipe();
  });

  const requestRow = () => ({ source: 'request' });

  const updateRow = (type: NotificationType) => ({
    source: 'update',
    obj_notification_type: { type }
  });

  it('should no-op and return the original list when the selected labels array is empty', () => {
    const list = [requestRow(), updateRow(NotificationType.RESULT_QUALITY_ASSESSED)];

    const result = pipe.transform(list, []);

    expect(result).toEqual(list);
  });

  it('should return an empty array when the list is falsy', () => {
    const result = pipe.transform(null, [CONTRIBUTION_REQUEST_LABEL]);

    expect(result).toEqual([]);
  });

  // Falsifier (NOTIF-T-11 verification): filtering by Type behaves like the existing chip taxonomy
  // (no fabricated sub-types) — every request-source row shares the single "Contribution request"
  // label, update-source rows are matched by their resolved NotificationType label.
  it('matches every request-source row under the single "Contribution request" label, excluding update rows', () => {
    const matchingRequest1 = requestRow();
    const matchingRequest2 = requestRow();
    const nonMatchingUpdate = updateRow(NotificationType.RESULT_QUALITY_ASSESSED);

    const result = pipe.transform([matchingRequest1, matchingRequest2, nonMatchingUpdate], [CONTRIBUTION_REQUEST_LABEL]);

    expect(result).toEqual([matchingRequest1, matchingRequest2]);
  });

  it('matches an update-source row by its resolved NotificationType label', () => {
    const matching = updateRow(NotificationType.RESULT_QUALITY_ASSESSED);
    const nonMatching = updateRow(NotificationType.ANNOUNCEMENT);
    const nonMatchingRequest = requestRow();

    const result = pipe.transform([matching, nonMatching, nonMatchingRequest], [NotificationType.RESULT_QUALITY_ASSESSED]);

    expect(result).toEqual([matching]);
  });

  it('matches across multiple selected labels at once (request + a specific update type)', () => {
    const matchingRequest = requestRow();
    const matchingUpdate = updateRow(NotificationType.ANNOUNCEMENT);
    const nonMatchingUpdate = updateRow(NotificationType.RESULT_QUALITY_ASSESSED);

    const result = pipe.transform(
      [matchingRequest, matchingUpdate, nonMatchingUpdate],
      [CONTRIBUTION_REQUEST_LABEL, NotificationType.ANNOUNCEMENT]
    );

    expect(result).toEqual([matchingRequest, matchingUpdate]);
  });

  // NOTIF-DD-4: a row with no `source` tag at all cannot resolve a type label and must be excluded,
  // not passed through, without throwing.
  it('excludes a field-less row (no source tag) when the type filter is active, without throwing', () => {
    const fieldLessRow = { notification_id: 1 };
    const matching = requestRow();

    let result;
    expect(() => {
      result = pipe.transform([fieldLessRow, matching] as any, [CONTRIBUTION_REQUEST_LABEL]);
    }).not.toThrow();

    expect(result).toEqual([matching]);
    expect(result).not.toContain(fieldLessRow);
  });

  // NOTIF-DD-4-adjacent: an update-source row whose type cannot be resolved (unrecognized/missing
  // obj_notification_type and no legacy numeric id) is excluded too, without throwing.
  it('excludes an update-source row whose type cannot be resolved, without throwing', () => {
    const unresolvableUpdate = { source: 'update', obj_notification_type: { type: 'Some Unknown Type' } };
    const matching = requestRow();

    let result;
    expect(() => {
      result = pipe.transform([unresolvableUpdate, matching] as any, [CONTRIBUTION_REQUEST_LABEL]);
    }).not.toThrow();

    expect(result).toEqual([matching]);
  });
});
