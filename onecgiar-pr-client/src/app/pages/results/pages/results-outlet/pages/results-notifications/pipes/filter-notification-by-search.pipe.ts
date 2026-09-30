import { Pipe, PipeTransform } from '@angular/core';
import { buildResultNotificationText } from '../../../../../../../shared/constants/notification-type.constants';

@Pipe({
  name: 'appFilterNotificationBySearch',
  standalone: false
})
export class FilterNotificationBySearchPipe implements PipeTransform {
  /**
   * NOTIF-T-6 fix (flagged by NOTIF-T-3's Reviewer): `isUpdateTab` used to be a single flag applied
   * to the WHOLE list — correct while Requests and Updates rendered as two separate tabs (every row
   * in a given call really was all-Requests or all-Updates), but wrong once `buildUnifiedList()`
   * (`NOTIF-T-1`) merges both into one array: a genuinely mixed list needs each row to pick its own
   * text-builder branch. Every unified row carries `source: 'request' | 'update'` — when present,
   * it decides the branch PER ROW, overriding the list-wide flag; `isUpdateTab` is kept as the
   * fallback for callers that still pass un-tagged, single-source arrays (`received-requests`/
   * `sent-requests`/`updates` templates, unchanged call sites).
   */
  transform(list, searchFilter: string, isUpdateTab: boolean = false): any[] {
    if (!searchFilter) {
      return list;
    }

    list.forEach(item => {
      item.joinAll = this.createJoinAllString(item, isUpdateTab);
    });

    return list.filter(item => item.joinAll.toUpperCase().includes(searchFilter.toUpperCase()));
  }

  private createJoinAllString(item, isUpdateTab: boolean): string {
    const useUpdateBuilder = item?.source === 'update' ? true : item?.source === 'request' ? false : isUpdateTab;

    if (useUpdateBuilder) {
      return this.createUpdateTabString(item);
    } else {
      return this.createDefaultString(item);
    }
  }

  private createUpdateTabString(item): string {
    return buildResultNotificationText(item);
  }

  private createDefaultString(item): string {
    if (item.is_map_to_toc) {
      return `${item?.obj_requested_by?.first_name} ${item?.obj_requested_by?.last_name} from ${item?.obj_shared_inititiative?.official_code} has requested contribution to result ${item?.obj_result?.result_code} - ${item?.obj_result?.title} submitted by ${item?.obj_owner_initiative?.official_code}`;
    }

    return `${item?.obj_requested_by?.first_name} ${item?.obj_requested_by?.last_name} from ${item?.obj_owner_initiative?.official_code} has requested inclusion of ${item?.obj_shared_inititiative?.official_code} as a contributor to result ${item?.obj_result?.result_code} - ${item?.obj_result?.title}`;
  }
}
