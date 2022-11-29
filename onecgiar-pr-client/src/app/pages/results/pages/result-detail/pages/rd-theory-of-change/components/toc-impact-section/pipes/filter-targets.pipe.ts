import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterTargets'
})
export class FilterTargetsPipe implements PipeTransform {
  transform(list: any[], impact_area_id: number): any {
    if (!list.length) return [];
    return list.filter(item => item.impactAreaId == impact_area_id);
  }
}
