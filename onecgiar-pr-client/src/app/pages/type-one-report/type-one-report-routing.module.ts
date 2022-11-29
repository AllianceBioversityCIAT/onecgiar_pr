import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TypeOneReportComponent } from './type-one-report.component';

const routes: Routes = [{ path: '', component: TypeOneReportComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TypeOneReportRoutingModule {}
