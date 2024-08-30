import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appFilterNotificationBySearch'
})
export class FilterNotificationBySearchPipe implements PipeTransform {
  transform(list: any[], searchFilter: string): any[] {
    if (!searchFilter) {
      return list;
    }

    list.forEach(item => {
      item.joinAll = `${item?.obj_result?.result_code} - ${item?.obj_result?.title} - ${item?.obj_shared_inititiative?.official_code} - ${item?.obj_owner_initiative?.official_code}`;
    });

    return list.filter(item => item.joinAll.toUpperCase().indexOf(searchFilter?.toUpperCase()) > -1);
  }
}
