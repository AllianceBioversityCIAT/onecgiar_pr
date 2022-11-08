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
import { PrTextareaComponent } from './pr-textarea/pr-textarea.component';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { PrCheckboxComponent } from './pr-checkbox/pr-checkbox.component';
import { CheckboxModule } from 'primeng/checkbox';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ListFilterByTextAndAttrPipe } from './pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { SaveButtonComponent } from './save-button/save-button.component';
import { PrButtonComponent } from './pr-button/pr-button.component';
import { AlertStatusComponent } from './alert-status/alert-status.component';
import { EditOrDeleteItemButtonComponent } from './edit-or-delete-item-button/edit-or-delete-item-button.component';
import { AddButtonComponent } from './add-button/add-button.component';
import { NoDataTextComponent } from './no-data-text/no-data-text.component';
import { PrRangeLevelComponent } from './pr-range-level/pr-range-level.component';

const fieldComponents = [PrInputComponent, PrSelectComponent, PrRadioButtonComponent, DetailSectionTitleComponent, PrMultiSelectComponent, PrFieldHeaderComponent, PrYesOrNotComponent, PrTextareaComponent, PrCheckboxComponent, SaveButtonComponent, PrButtonComponent, AlertStatusComponent, EditOrDeleteItemButtonComponent, NoDataTextComponent, AddButtonComponent, PrRangeLevelComponent];

@NgModule({
  declarations: [...fieldComponents, PrFieldValidationsComponent, PrWordCounterComponent, ListFilterByTextAndAttrPipe],
  exports: [...fieldComponents, FormsModule],
  imports: [CommonModule, FormsModule, InputTextModule, DropdownModule, RadioButtonModule, MultiSelectModule, InputTextareaModule, CheckboxModule, ScrollingModule]
})
export class CustomFieldsModule {}
