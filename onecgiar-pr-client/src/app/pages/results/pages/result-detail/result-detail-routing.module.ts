import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultDetailComponent } from './result-detail.component';
import { resultDetailRouting } from '../../../../shared/routing/routing-data';

const routes: Routes = [
  {
    path: '',
    component: ResultDetailComponent,
    children: resultDetailRouting
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultDetailRoutingModule {}
