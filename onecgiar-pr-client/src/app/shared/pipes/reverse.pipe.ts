import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reverse',
  standalone: true
})
export class ReversePipe implements PipeTransform {
  transform<T>(value: T[]): T[] {
    if (!Array.isArray(value)) {
      return value;
    }
    return [...value].reverse();
  }
}

