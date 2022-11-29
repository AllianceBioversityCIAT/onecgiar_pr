import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterIndicators'
})
export class FilterIndicatorsPipe implements PipeTransform {
  transform(list: any[], impact_area_id: number): any {
    if (!list.length) return [];
    // console.log(list);
    return list.filter(item => item.impact_area_id == impact_area_id);
  }
}
