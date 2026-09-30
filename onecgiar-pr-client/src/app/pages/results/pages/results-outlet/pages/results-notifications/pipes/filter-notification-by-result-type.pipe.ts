import { Pipe, PipeTransform } from '@angular/core';

type TNotificationItem = {
  obj_result?: {
    obj_result_type?: {
      name?: string;
    };
  };
};

/**
 * NOTIF-T-11 (`NOTIF-R-16`): filters by `obj_result.obj_result_type.name` — widened onto
 * Updates-tab rows by `NOTIF-T-8`, so this pipe filters the whole unified list (Requests and
 * Updates alike), not only Requests-tab rows.
 *
 * `NOTIF-DD-4`: a row missing `obj_result.obj_result_type.name` is excluded when this filter is
 * active, not passed through.
 */
@Pipe({
  name: 'filterNotificationByResultType',
  standalone: false
})
export class FilterNotificationByResultTypePipe implements PipeTransform {
  transform(list: any[], selectedTypeNames: string[]): any[] {
    if (!selectedTypeNames?.length) return list;
    if (!list?.length) return [];

    return list.filter((item: TNotificationItem) => {
      const typeName = item?.obj_result?.obj_result_type?.name;
      return !!typeName && selectedTypeNames.includes(typeName);
    });
  }
}
