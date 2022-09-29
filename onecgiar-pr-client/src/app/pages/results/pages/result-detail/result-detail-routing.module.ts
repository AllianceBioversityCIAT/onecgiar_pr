import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resultDetailRouting } from 'src/app/shared/routing/routing-data';
import { ResultDetailComponent } from './result-detail.component';

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
