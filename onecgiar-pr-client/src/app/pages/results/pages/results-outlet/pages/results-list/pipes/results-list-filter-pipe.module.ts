import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultsListFilterPipe } from './results-list-filter.pipe';

@NgModule({
  declarations: [ResultsListFilterPipe],
  exports: [ResultsListFilterPipe],
  imports: [CommonModule]
})
export class ResultsListFilterPipeModule {}
