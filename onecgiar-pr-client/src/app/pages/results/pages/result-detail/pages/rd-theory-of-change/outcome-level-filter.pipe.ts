import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'outcomeLevelFilter',
    standalone: false
})
export class OutcomeLevelFilterPipe implements PipeTransform {
  transform(list: any[], toc_level_id: number): any {
    //(list);
    const result = [];
    result.push(list.find(item => item.toc_level_id == toc_level_id));
    result.push(list.find(item => item.toc_level_id == 3));
    if (!list?.length) return [];
    return result;
  }
}
