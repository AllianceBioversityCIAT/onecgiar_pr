import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterNotificationByPhase'
})
export class FilterNotificationByPhasePipe implements PipeTransform {
  transform(list, phaseId: string) {
    if (!phaseId) return list;
    if (!list?.length) return [];

    return list.filter((item: any) => item?.obj_result?.obj_version?.id == phaseId);
  }
}
