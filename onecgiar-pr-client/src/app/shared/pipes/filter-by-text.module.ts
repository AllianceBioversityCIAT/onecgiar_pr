import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterByTextPipe } from './filter-by-text.pipe';

@NgModule({
  declarations: [FilterByTextPipe],
  exports: [FilterByTextPipe],
  imports: [CommonModule]
})
export class FilterByTextModule {}
