import { Pipe, PipeTransform } from '@angular/core';

type TNotificationItem = {
  obj_result?: {
    source_name?: 'W1/W2' | 'W3/Bilaterals';
  };
};

/**
 * NOTIF-T-11 (`NOTIF-R-16`): filters by `obj_result.source_name` (`'W1/W2'` | `'W3/Bilaterals'`) —
 * widened onto Updates-tab rows by `NOTIF-T-8`, so this pipe filters the whole unified list
 * (Requests and Updates alike), not only Requests-tab rows.
 *
 * `NOTIF-DD-4`: a row missing `obj_result.source_name` is excluded when this filter is active, not
 * passed through.
 */
@Pipe({
  name: 'filterNotificationByFunding',
  standalone: false
})
export class FilterNotificationByFundingPipe implements PipeTransform {
  transform(list: any[], selectedSourceNames: string[]): any[] {
    if (!selectedSourceNames?.length) return list;
    if (!list?.length) return [];

    return list.filter((item: TNotificationItem) => {
      const sourceName = item?.obj_result?.source_name;
      return !!sourceName && selectedSourceNames.includes(sourceName);
    });
  }
}
