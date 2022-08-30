import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'results', loadChildren: () => import('./pages/results/results.module').then(m => m.ResultsModule) },
  { path: 'type-one-report', loadChildren: () => import('./pages/type-one-report/type-one-report.module').then(m => m.TypeOneReportModule) },
  { path: '**', pathMatch: 'full', redirectTo: 'results' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
