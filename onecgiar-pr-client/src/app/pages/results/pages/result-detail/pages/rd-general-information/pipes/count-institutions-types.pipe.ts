import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'countInstitutionsTypes'
})
export class CountInstitutionsTypesPipe implements PipeTransform {
  transform(list: any[], toggle: number): any {
    console.log(list);
    const objectCounter = {};
    const result = [];
    list.map(item => {
      let count = () => {
        if (!objectCounter[item?.institutions_type_id]?.count && !item.hasOwnProperty('institutions_id')) return 0;
        return typeof objectCounter[item?.institutions_type_id]?.count == 'number' ? objectCounter[item?.institutions_type_id]?.count + 1 : 1;
      };
      // console.log(objectCounter[item?.institutions_type_id]?.count);
      objectCounter[item?.institutions_type_id] = { count_name: `${item?.institutions_type_name}(${count()})`, count: count() };
    });
    Object.keys(objectCounter).map(item => {
      result.push(objectCounter[item]);
    });
    // console.log(objectCounter);
    // console.log(Object.keys(objectCounter));
    // console.log(result);
    return result;
  }
}
