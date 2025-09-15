// term.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { TerminologyService } from './terminology.service';
import { TermKey } from './terminology.config';

@Pipe({ name: 'term', standalone: true, pure: false })
export class TermPipe implements PipeTransform {
  private terms = inject(TerminologyService);

  transform(key: TermKey, portfolioAcronym): string {
    return this.terms.t(key, portfolioAcronym);
  }
}
