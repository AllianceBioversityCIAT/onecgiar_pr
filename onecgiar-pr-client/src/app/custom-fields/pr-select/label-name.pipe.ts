import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'labelName',
    standalone: false
})
export class LabelNamePipe implements PipeTransform {
  transform(list: any[], id: any, optionValue: string, optionLabel: string): any {
    // Whole-object binding: when there is no optionValue, `id` is the selected option itself.
    if (!optionValue) {
      return id ? id[optionLabel] : '';
    }
    const elementasdsdasd = (list || []).find(item => item[optionValue] == id);
    if (elementasdsdasd) return elementasdsdasd[optionLabel];

    return '';
  }
}
