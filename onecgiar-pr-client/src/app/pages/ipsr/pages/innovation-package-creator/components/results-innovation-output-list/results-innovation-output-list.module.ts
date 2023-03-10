import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { ResultsInnovationOutputListComponent } from './results-innovation-output-list.component';

@NgModule({
  declarations: [ResultsInnovationOutputListComponent],
  exports: [ResultsInnovationOutputListComponent],
  imports: [CommonModule, TableModule, RouterModule]
})
export class ResultsInnovationOutputListModule {}
