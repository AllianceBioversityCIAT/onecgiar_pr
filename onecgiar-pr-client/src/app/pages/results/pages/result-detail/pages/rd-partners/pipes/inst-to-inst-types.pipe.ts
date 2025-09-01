import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'instToInstTypes',
    standalone: false
})
export class InstToInstTypesPipe implements PipeTransform {
  transform(list: any[]) {
    return list;
  }
}
