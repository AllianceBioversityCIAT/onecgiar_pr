import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resultRouting, routingApp } from 'src/app/shared/routing/routing-data';
import { ResultsComponent } from './results.component';

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
