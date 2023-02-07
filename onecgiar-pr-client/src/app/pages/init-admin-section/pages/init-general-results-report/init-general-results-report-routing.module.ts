import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InitGeneralResultsReportComponent } from './init-general-results-report.component';

const routes: Routes = [{ path: '', component: InitGeneralResultsReportComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InitGeneralResultsReportRoutingModule {}
