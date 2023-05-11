import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfReportsRoutingModule } from './pdf-reports-routing.module';
import { PdfReportsComponent } from './pdf-reports.component';

@NgModule({
  declarations: [PdfReportsComponent],
  exports: [PdfReportsComponent],
  imports: [CommonModule, PdfReportsRoutingModule]
})
export class PdfReportsModule {}
