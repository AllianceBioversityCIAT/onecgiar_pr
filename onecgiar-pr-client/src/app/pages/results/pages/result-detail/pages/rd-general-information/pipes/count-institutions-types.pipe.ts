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
        if (!objectCounter[item?.obj_institutions?.obj_institution_type_code?.id]?.count && !item.hasOwnProperty('institutions_id')) return 0;
        return typeof objectCounter[item?.obj_institutions?.obj_institution_type_code?.id]?.count == 'number'
          ? objectCounter[item?.obj_institutions?.obj_institution_type_code?.id]?.count + 1
          : 1;
      };
      objectCounter[item?.obj_institutions?.obj_institution_type_code?.id] = {
        count_name: `${item?.obj_institutions?.obj_institution_type_code?.name} (${count()})`,
        count: count()
      };
    });

    Object.keys(objectCounter).forEach(item => {
      result.push(objectCounter[item]);
    });

    return result;
  }
}
