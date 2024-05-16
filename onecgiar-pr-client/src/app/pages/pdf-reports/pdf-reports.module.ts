import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfReportsRoutingModule } from './pdf-reports-routing.module';
import { PdfReportsComponent } from './pdf-reports.component';
import { PageAlertModule } from '../../shared/components/page-alert/page-alert.module';

@NgModule({
  declarations: [PdfReportsComponent],
  exports: [PdfReportsComponent],
  imports: [CommonModule, PdfReportsRoutingModule, PageAlertModule]
})
export class PdfReportsModule {}
