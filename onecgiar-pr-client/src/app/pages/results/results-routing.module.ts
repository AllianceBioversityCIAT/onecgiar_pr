import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsComponent } from './results.component';

const routes: Routes = [
  {
    path: '', component: ResultsComponent, children: [
      { path: 'result-creator', loadChildren: () => import('./pages/result-creator/result-creator.module').then(m => m.ResultCreatorModule) },
      { path: 'result-detail/:id', loadChildren: () => import('./pages/result-detail/result-detail.module').then(m => m.ResultDetailModule) },
      { path: 'results-list', loadChildren: () => import('./pages/results-list/results-list.module').then(m => m.ResultsListModule) },
      { path: '**', pathMatch: 'full', redirectTo: 'results-list' },
    ]
  }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultsRoutingModule { }
