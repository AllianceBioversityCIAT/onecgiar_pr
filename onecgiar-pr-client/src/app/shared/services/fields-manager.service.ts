import { Injectable, computed, inject, signal } from '@angular/core';
import { CustomField } from '../interfaces/customField.interface';
import { DataControlService } from './data-control.service';
enum Portfolios {
  'P22' = 0,
  'P25' = 1
}
@Injectable({
  providedIn: 'root'
})
export class FieldsManagerService {
  dataControlSE = inject(DataControlService);
  show = signal(false);
  portfolioAcronym = signal('P25');
  fields = computed<Record<string, CustomField>>(() => {
    return {
      '[general-info]-title': {
        label: 'Title',
        placeholder: 'Enter text',
        show: true,
        description: `<ul>
            <li>Provide a clear, informative name of the output, for a non-specialist reader and without acronyms.</li>
            <li>Avoid abbreviations or (technical) jargon.</li>
            ${Portfolios[this.portfolioAcronym()] == Portfolios.P25 ? '<li>For innovations, varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
          </ul>`
      },
      '[general-info]-description': {
        label: 'Description',
        placeholder: 'Enter text',
        show: true,
        description: `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
     <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
      ${Portfolios[this.portfolioAcronym()] == Portfolios.P25 ? '<li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
    </ul>`
      }
    };
  });
  constructor() {
    // setInterval(() => {
    //   this.show.set(!this.show());
    //   this.portfolioAcronym.set(this.portfolioAcronym() === 'P22' ? 'P25' : 'P22');
    //   console.log(this.show());
    // }, 1000);
  }
}
