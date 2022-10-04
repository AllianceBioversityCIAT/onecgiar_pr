import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsOutletComponent } from './results-outlet.component';
import { resultsOutletRouting } from '../../../../shared/routing/routing-data';

const routes: Routes = [{ path: '', component: ResultsOutletComponent, children: resultsOutletRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultsOutletRoutingModule {}
