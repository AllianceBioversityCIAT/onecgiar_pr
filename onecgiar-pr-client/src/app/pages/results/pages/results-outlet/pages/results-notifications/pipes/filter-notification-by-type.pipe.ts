import { Pipe, PipeTransform } from '@angular/core';
import { resolveNotificationType } from '../../../../../../../shared/constants/notification-type.constants';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../internationalization/contribution-request-drawer.copy';

type TNotificationItem = {
  source?: 'request' | 'update';
  obj_notification_type?: { type?: string };
  notification_type?: number | string;
};

/**
 * NOTIF-T-11 (`NOTIF-R-16`): filters by the row's rendered Type chip/label — `"Contribution
 * request"` for every `source:'request'` row, or the resolved `NotificationType` label for every
 * `source:'update'` row. Deliberately reuses `resolveNotificationType()` (same source
 * `notification-item.component.ts::rowTypeChipLabel` reads) rather than reimplementing the label
 * resolution — the chip taxonomy must never drift between the row and this filter.
 *
 * `NOTIF-DD-4`: a row with no `source` tag (and therefore no resolvable label) is excluded when
 * this filter is active, not passed through.
 */
@Pipe({
  name: 'filterNotificationByType',
  standalone: false
})
export class FilterNotificationByTypePipe implements PipeTransform {
  transform(list: any[], selectedLabels: string[]): any[] {
    if (!selectedLabels?.length) return list;
    if (!list?.length) return [];

    return list.filter((item: TNotificationItem) => {
      const label = this.rowTypeLabel(item);
      return !!label && selectedLabels.includes(label);
    });
  }

  private rowTypeLabel(item: TNotificationItem): string | null {
    if (item?.source === 'update') return resolveNotificationType(item);
    if (item?.source === 'request') return CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.contributionRequestChip;
    return null;
  }
}
