import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'yesOrNotByBoolean'
})
export class YesOrNotByBooleanPipe implements PipeTransform {
  transform(value: unknown): unknown {
    // console.log(value);
    switch (value) {
      case true:
        return 'Yes';
      case false:
        return 'No';
      default:
        return value;
    }
  }
}
