import { Pipe, PipeTransform } from '@angular/core';

type TNotificationItem = {
  obj_result: {
    obj_result_by_project?: {
      obj_clarisa_project?: {
        shortName?: string;
      };
    }[];
  };
};

@Pipe({
    name: 'filterNotificationByBilateralProject',
    standalone: false
})
export class FilterNotificationByBilateralProjectPipe implements PipeTransform {
  // NOTIF-T-6: see the identical note in filter-notification-by-center.pipe.ts — `any[]` on the
  // signature so this pipe can chain with filterNotificationByCenter in the same template pipeline
  // without the Angular template type-checker treating the two files' local `TNotificationItem` as
  // unrelated types (`npm run build` catches this; `tsc --noEmit` does not).
  //
  // NOTIF-T-16: `projectIds` are `clarisa_projects.short_name` values (the facet's `code`, e.g.
  // `'B-A1080'`) — NOT `obj_result.result_code`, which is the notification's own RESULT code and was
  // the root cause of this pipe filtering on the wrong identifier. `results_by_projects` is a
  // many-to-many join (`obj_result.obj_result_by_project[]`), so a row matches if ANY of its linked
  // projects' `shortName` is in the selected set.
  transform(list: any[], projectIds: string[]): any[] {
    if (!projectIds?.length) return list;
    if (!list?.length) return [];

    return list.filter((item: TNotificationItem) => {
      const projectLinks = item?.obj_result?.obj_result_by_project ?? [];
      return projectLinks.some(link => projectIds.some(projectId => link?.obj_clarisa_project?.shortName === projectId));
    });
  }
}
