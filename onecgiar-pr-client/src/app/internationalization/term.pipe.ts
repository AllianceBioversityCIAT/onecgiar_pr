// term.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { TerminologyService } from './terminology.service';
import { TermKey } from './terminology.config';
import { DataControlService } from '../shared/services/data-control.service';

@Pipe({ name: 'term', standalone: true, pure: false })
export class TermPipe implements PipeTransform {
  private terms = inject(TerminologyService);
  private dataControlSE = inject(DataControlService);

  transform(key: TermKey, portfolioAcronym: string = this.dataControlSE.currentResult?.portfolio): string {
    return this.terms.t(key, portfolioAcronym);
  }
}
