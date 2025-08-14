import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterInitWithRoleCoordAndLead',
    standalone: false
})
export class FilterInitWithRoleCoordAndLeadPipe implements PipeTransform {
  transform(list) {
    const resultList = list?.filter(init => init?.role == 'Lead' || init?.role == 'Coordinator');
    if (!resultList?.length) return [];
    return resultList;
  }
}
