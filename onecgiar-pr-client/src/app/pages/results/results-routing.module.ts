import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsComponent } from './results.component';
import { resultRouting } from '../../shared/routing/routing-data';

const routes: Routes = [
  {
    path: '',
    component: ResultsComponent,
    children: resultRouting
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultsRoutingModule {}
