import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'appFilterNotificationBySearch',
    standalone: false
})
export class FilterNotificationBySearchPipe implements PipeTransform {
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
    if (isUpdateTab) {
      return this.createUpdateTabString(item);
    } else {
      return this.createDefaultString(item);
    }
  }

  private createUpdateTabString(item): string {
    if (item?.notification_type === 1 || item?.notification_type === 2) {
      return `${item?.obj_emitter_user?.first_name} ${item?.obj_emitter_user?.last_name} has ${
        item?.notification_type === 1 ? 'submitted' : 'unsubmitted'
      } the result ${item?.obj_result?.result_code} - ${item?.obj_result?.title}`;
    }

    return `The result ${item?.obj_result?.result_code} - ${item?.obj_result?.title} was successfully Quality Assessed.`;
  }

  private createDefaultString(item): string {
    if (item.is_map_to_toc) {
      return `${item?.obj_requested_by?.first_name} ${item?.obj_requested_by?.last_name} from ${item?.obj_shared_inititiative?.official_code} has requested contribution to result ${item?.obj_result?.result_code} - ${item?.obj_result?.title} submitted by ${item?.obj_owner_initiative?.official_code}`;
    }

    return `${item?.obj_requested_by?.first_name} ${item?.obj_requested_by?.last_name} from ${item?.obj_owner_initiative?.official_code} has requested inclusion of ${item?.obj_shared_inititiative?.official_code} as a contributor to result ${item?.obj_result?.result_code} - ${item?.obj_result?.title}`;
  }
}
