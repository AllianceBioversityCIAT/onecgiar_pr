import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterOutcomeLevelByBoolean',
    standalone: false
})
export class FilterOutcomeLevelByBooleanPipe implements PipeTransform {
  transform(list: any, yes: boolean): unknown {
    const res = list.filter(item => item.toc_level_id === (!yes ? 4 : 2) || item.toc_level_id === 3);
    return res;
  }
}
