import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrInputComponent } from './pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PrSelectComponent } from './pr-select/pr-select.component';
import { RadioButtonComponent } from './radio-button/radio-button.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { PrFieldHeaderComponent } from './pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from './pr-field-validations/pr-field-validations.component';
import { PrWordCounterComponent } from './pr-word-counter/pr-word-counter.component';

const fieldComponents = [PrInputComponent, PrSelectComponent, RadioButtonComponent];

@NgModule({
  declarations: [...fieldComponents, PrFieldHeaderComponent, PrFieldValidationsComponent, PrWordCounterComponent],
  exports: [...fieldComponents],
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule, RadioButtonModule]
})
export class CustomFieldsModule {}
