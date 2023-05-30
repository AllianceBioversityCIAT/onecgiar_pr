import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'labelName'
})
export class LabelNamePipe implements PipeTransform {
  transform(list: any[], id: string, optionValue: string, optionLabel: string): any {
    // if (optionValue == 'toc_level_id') console.log(id);
    //('change');
    const elementasdsdasd = list.find(item => item[optionValue] == id);
    if (elementasdsdasd) return elementasdsdasd[optionLabel];

    return '';
  }
}
