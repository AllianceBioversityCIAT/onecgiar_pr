import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { ResultsInnovationOutputListComponent } from './results-innovation-output-list.component';
import { FilterByTextModule } from '../../../../../../shared/pipes/filter-by-text.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [ResultsInnovationOutputListComponent],
  exports: [ResultsInnovationOutputListComponent],
  imports: [CommonModule, TableModule, RouterModule, FilterByTextModule, FormsModule]
})
export class ResultsInnovationOutputListModule {}
