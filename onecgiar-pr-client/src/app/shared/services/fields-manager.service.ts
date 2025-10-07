import { Injectable, computed, signal } from '@angular/core';
import { CustomField } from '../interfaces/customField.interface';

@Injectable({
  providedIn: 'root'
})
export class FieldsManagerService {
  show = signal(false);
  portfolioAcronym = signal('P22');
  fields = computed<Record<string, CustomField>>(() => {
    return {
      '[general-info]-description': {
        label: 'Description',
        placeholder: 'Enter text',
        show: true,
        description: `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
     <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
    </ul>`
      },
      '[general-info]-title': {
        label: 'Title',
        placeholder: 'Enter text',
        show: true,
        description: `<ul>
    <li>Provide a clear, informative name of the output, for a non-specialist reader and without acronyms.</li>
    <li>Avoid abbreviations or (technical) jargon.</li>
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
