import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFilterMultiselectComponent } from './pr-filter-multiselect.component';
import { HlmInput } from '@spartan/input';

@NgModule({
  declarations: [PrFilterMultiselectComponent],
  exports: [PrFilterMultiselectComponent],
  imports: [CommonModule, FormsModule, HlmInput]
})
export class PrFilterMultiselectModule {}
