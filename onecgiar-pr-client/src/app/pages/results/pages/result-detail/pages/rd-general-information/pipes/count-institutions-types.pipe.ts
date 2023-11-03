import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'countInstitutionsTypes'
})
export class CountInstitutionsTypesPipe implements PipeTransform {
  transform(list: any[], toggle: number): any {
    const objectCounter = {};
    const result = [];

    list.forEach(item => {
      const count = () => {
        if (!objectCounter[item?.institutions_type_id]?.count && !item.hasOwnProperty('institutions_id')) return 0;
        return typeof objectCounter[item?.institutions_type_id]?.count == 'number' ? objectCounter[item?.institutions_type_id]?.count + 1 : 1;
      };
      objectCounter[item?.institutions_type_id] = { count_name: `${item?.institutions_type_name} (${count()})`, count: count() };
    });

    Object.keys(objectCounter).forEach(item => {
      result.push(objectCounter[item]);
    });

    return result;
  }
}
