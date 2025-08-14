import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterNotificationByPhase',
    standalone: false
})
export class FilterNotificationByPhasePipe implements PipeTransform {
  transform(list, phaseId: string) {
    if (!phaseId) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => item.version_id == phaseId);
  }
}
