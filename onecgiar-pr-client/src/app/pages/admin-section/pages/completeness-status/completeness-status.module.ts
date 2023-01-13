import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CompletenessStatusRoutingModule } from './completeness-status-routing.module';
import { CompletenessStatusComponent } from './completeness-status.component';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [CompletenessStatusComponent],
  exports: [CompletenessStatusComponent],
  imports: [CommonModule, CompletenessStatusRoutingModule, ProgressBarModule, TableModule, FormsModule]
})
export class CompletenessStatusModule {}
