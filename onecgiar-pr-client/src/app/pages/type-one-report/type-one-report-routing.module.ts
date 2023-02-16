import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TypeOneReportComponent } from './type-one-report.component';
import { TypePneReportRouting } from '../../shared/routing/routing-data';

const routes: Routes = [
  {
    path: '',
    component: TypeOneReportComponent,
    children: TypePneReportRouting
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TypeOneReportRoutingModule {}
