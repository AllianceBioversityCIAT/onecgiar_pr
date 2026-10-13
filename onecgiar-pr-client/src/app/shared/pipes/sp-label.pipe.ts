import { Pipe, PipeTransform } from '@angular/core';
import { ScienceProgramNameFields, scienceProgramLabel } from '../utils/science-program-label.util';

@Pipe({
  name: 'spLabel',
  standalone: true
})
export class SpLabelPipe implements PipeTransform {
  transform(value: ScienceProgramNameFields | null | undefined): string {
    return scienceProgramLabel(value?.official_code, value?.name, value?.initiative_name, value?.short_name);
  }
}
