import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultFrameworkReportingComponent } from './result-framework-reporting.component';
import { ResultFrameworkReportingRouting } from '../../shared/routing/routing-data';

const routes: Routes = [
  {
    path: '',
    component: ResultFrameworkReportingComponent,
    children: ResultFrameworkReportingRouting
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultFrameworkReportingRoutingModule {}
