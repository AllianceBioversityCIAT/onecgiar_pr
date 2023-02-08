import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterByAttrWithValuePipe } from './filter-by-attr-with-value.pipe';

@NgModule({
  declarations: [FilterByAttrWithValuePipe, FilterByAttrWithValuePipe],
  exports: [FilterByAttrWithValuePipe, FilterByAttrWithValuePipe],
  imports: [CommonModule]
})
export class FilterByAttrWithValueModule {}
