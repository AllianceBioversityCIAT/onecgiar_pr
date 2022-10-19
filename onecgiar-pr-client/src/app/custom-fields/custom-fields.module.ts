import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrInputComponent } from './pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PrSelectComponent } from './pr-select/pr-select.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { PrFieldHeaderComponent } from './pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from './pr-field-validations/pr-field-validations.component';
import { PrWordCounterComponent } from './pr-word-counter/pr-word-counter.component';
import { DetailSectionTitleComponent } from './detail-section-title/detail-section-title.component';
import { PrRadioButtonComponent } from './pr-radio-button/pr-radio-button.component';
import { PrMultiSelectComponent } from './pr-multi-select/pr-multi-select.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { PrYesOrNotComponent } from './pr-yes-or-not/pr-yes-or-not.component';

const fieldComponents = [PrInputComponent, PrSelectComponent, PrRadioButtonComponent, DetailSectionTitleComponent, PrMultiSelectComponent, PrFieldHeaderComponent, PrYesOrNotComponent];

@NgModule({
  declarations: [...fieldComponents, PrFieldValidationsComponent, PrWordCounterComponent],
  exports: [...fieldComponents, FormsModule],
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule, RadioButtonModule, MultiSelectModule]
})
export class CustomFieldsModule {}
