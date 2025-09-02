import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterNotificationByInitiative',
    standalone: false
})
export class FilterNotificationByInitiativePipe implements PipeTransform {
  transform(list, initiativeId: string) {
    if (!initiativeId) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => item.shared_inititiative_id == initiativeId);
  }
}
