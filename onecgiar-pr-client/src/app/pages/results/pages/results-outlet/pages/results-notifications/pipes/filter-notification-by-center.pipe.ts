import { Pipe, PipeTransform } from '@angular/core';

type TNotificationItem = {
  obj_result: {
    result_center_array?: {
      clarisa_center_object?: {
        clarisa_institution?: {
          id: string | number;
        };
      };
    }[];
  };
};

@Pipe({
    name: 'filterNotificationByCenter',
    standalone: false
})
export class FilterNotificationByCenterPipe implements PipeTransform {
  // NOTIF-T-6: `list`/return typed as `any[]`, not `TNotificationItem[]` — this pipe now chains
  // after `filterNotificationByBilateralProject` (each pipe file declares its own local, structurally
  // distinct `TNotificationItem`), and the Angular template type-checker (`npm run build`, not caught
  // by `tsc --noEmit` alone — onecgiar-pr-client/src/CLAUDE.md §21.7) treats those as unrelated types.
  // The narrower type is kept for the filter callback below, where it documents the real field path.
  transform(list: any[], centerIds: (string | number)[]): any[] {
    if (!centerIds?.length) return list;
    if (!list?.length) return [];

    return list.filter((item: TNotificationItem) =>
      centerIds.some(centerId => item?.obj_result?.result_center_array?.[0]?.clarisa_center_object?.clarisa_institution?.id == centerId)
    );
  }
}
