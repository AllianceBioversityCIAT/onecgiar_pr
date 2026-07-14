import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrInputComponent } from './pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { PrSelectComponent } from './pr-select/pr-select.component';
import { PrFieldHeaderComponent } from './pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from './pr-field-validations/pr-field-validations.component';
import { PrWordCounterComponent } from './pr-word-counter/pr-word-counter.component';
import { DetailSectionTitleComponent } from './detail-section-title/detail-section-title.component';
import { PrRadioButtonComponent } from './pr-radio-button/pr-radio-button.component';
import { PrMultiSelectComponent } from './pr-multi-select/pr-multi-select.component';
import { PrYesOrNotComponent } from './pr-yes-or-not/pr-yes-or-not.component';
import { PrTextareaComponent } from './pr-textarea/pr-textarea.component';
import { PrCheckboxComponent } from './pr-checkbox/pr-checkbox.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ListFilterByTextAndAttrPipe } from './pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { SaveButtonComponent } from './save-button/save-button.component';
import { PrButtonComponent } from './pr-button/pr-button.component';
import { PrTooltipDirectiveModule } from '../shared/directives/pr-tooltip-directive.module';
import { AlertStatusComponent } from './alert-status/alert-status.component';
import { EditOrDeleteItemButtonComponent } from './edit-or-delete-item-button/edit-or-delete-item-button.component';
import { AddButtonComponent } from './add-button/add-button.component';
import { NoDataTextComponent } from './no-data-text/no-data-text.component';
import { PrRangeLevelComponent } from './pr-range-level/pr-range-level.component';
import { UnderConstructionPointComponent } from './under-construction-point/under-construction-point.component';
import { LabelNamePipe } from './pr-select/label-name.pipe';
import { SyncButtonComponent } from './sync-button/sync-button.component';
import { YesOrNotByBooleanPipe } from './pipes/yes-or-not-by-boolean.pipe';
import { HlmInput } from '@spartan/input';
import { CustomValidationTooltipComponent } from './custom-validation-tooltip/custom-validation-tooltip.component';
import { LeadContactPersonFieldComponent } from './lead-contact-person-field/lead-contact-person-field.component';
import { FieldCardComponent } from './field-card/field-card.component';

const fieldComponents = [
  FieldCardComponent,
  PrInputComponent,
  PrSelectComponent,
  PrRadioButtonComponent,
  DetailSectionTitleComponent,
  PrMultiSelectComponent,
  PrFieldHeaderComponent,
  PrYesOrNotComponent,
  CustomValidationTooltipComponent,
  PrTextareaComponent,
  PrCheckboxComponent,
  SaveButtonComponent,
  PrButtonComponent,
  AlertStatusComponent,
  EditOrDeleteItemButtonComponent,
  NoDataTextComponent,
  AddButtonComponent,
  PrRangeLevelComponent,
  SyncButtonComponent,
  LeadContactPersonFieldComponent
];

@NgModule({
  declarations: [
    ...fieldComponents,
    CustomValidationTooltipComponent,
    PrFieldValidationsComponent,
    PrWordCounterComponent,
    ListFilterByTextAndAttrPipe,
    UnderConstructionPointComponent,
    LabelNamePipe,
    YesOrNotByBooleanPipe
  ],
  exports: [...fieldComponents, FormsModule, PrTooltipDirectiveModule],
  imports: [CommonModule, FormsModule, ScrollingModule, HlmInput, PrTooltipDirectiveModule]
})
export class CustomFieldsModule {}
