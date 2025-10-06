import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FieldsManagerService {
  show = signal(false);
  portfolioAcronym = signal('P22');
  fields = computed(() => {
    return {
      '(result-general-info)-f-description': {
        label: 'Description',
        placeholder: 'Enter text',
        show: true,
        description: `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
     <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
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
