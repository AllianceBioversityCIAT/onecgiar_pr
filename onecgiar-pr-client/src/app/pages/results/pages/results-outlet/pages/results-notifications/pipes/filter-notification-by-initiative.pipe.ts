import { Pipe, PipeTransform } from '@angular/core';

type TNotificationItem = {
  obj_shared_inititiative: {
    id: string;
  };
  obj_owner_initiative: {
    id: string;
  };
  obj_result: {
    obj_result_by_initiatives: {
      initiative_id: string;
    }[];
  };
};

@Pipe({
    name: 'filterNotificationByInitiative',
    standalone: false
})
export class FilterNotificationByInitiativePipe implements PipeTransform {
  transform(list: TNotificationItem[], initiativeId: string) {
    if (!initiativeId) return list;
    if (!list?.length) return [];

    return list.filter(
      (item: TNotificationItem) =>
        item?.obj_shared_inititiative?.id == initiativeId ||
        item?.obj_owner_initiative?.id == initiativeId ||
        item?.obj_result?.obj_result_by_initiatives?.[0].initiative_id == initiativeId
    );
  }
}
