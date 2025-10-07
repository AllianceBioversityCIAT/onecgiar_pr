import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'labelName',
    standalone: false
})
export class LabelNamePipe implements PipeTransform {
  transform(list: any[], id: string, optionValue: string, optionLabel: string): any {
    const elementasdsdasd = list.find(item => item[optionValue] == id);
    if (elementasdsdasd) return elementasdsdasd[optionLabel];

    return '';
  }
}
