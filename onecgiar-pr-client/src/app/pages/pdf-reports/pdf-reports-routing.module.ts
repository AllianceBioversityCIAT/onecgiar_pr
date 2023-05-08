import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PdfReportsComponent } from './pdf-reports.component';

const routes: Routes = [{ path: '', component: PdfReportsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PdfReportsRoutingModule {}
