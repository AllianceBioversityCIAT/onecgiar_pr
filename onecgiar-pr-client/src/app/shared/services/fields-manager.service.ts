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

  portfolioAcronym = signal('P25');
  fields = computed<Record<string, CustomField>>(() => {
    console.log('fields');
    console.log(this.dataControlSE.isKnowledgeProductSignal());
    console.log(this.dataControlSE.currentResultSignal());
    console.log(this.dataControlSE.currentResultSignal()?.result_type_id);
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
        required: !this.dataControlSE.isKnowledgeProductSignal(),
        description: `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
     <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
      ${Portfolios[this.portfolioAcronym()] == Portfolios.P25 ? '<li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>' : ''}
    </ul>`
      },
      '[general-info]-lead_contact_person': {
        label: 'Lead contact person',
        placeholder: 'Search for a person (min 4 characters)',
        show: true,
        description: `For more precise results, we recommend searching by email or username.
    <br><strong>Examples:</strong> j.smith@cgiar.org; jsmith; JSmith`,
        required: Portfolios[this.portfolioAcronym()] == Portfolios.P25
      }
    };
  });
  constructor() {
    // setInterval(() => {
    //   this.portfolioAcronym.set(this.portfolioAcronym() === 'P22' ? 'P25' : 'P22');
    // }, 1000);
  }
}
