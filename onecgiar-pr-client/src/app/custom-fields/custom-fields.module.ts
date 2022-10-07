import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrInputComponent } from './pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PrSelectComponent } from './pr-select/pr-select.component';
import { RadioButtonComponent } from './radio-button/radio-button.component';
import { RadioButtonModule } from 'primeng/radiobutton';

const fieldComponents = [PrInputComponent, PrSelectComponent, RadioButtonComponent];

@NgModule({
  declarations: [...fieldComponents],
  exports: [...fieldComponents],
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule, RadioButtonModule]
})
export class CustomFieldsModule {}
