import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'result', loadChildren: () => import('./pages/results/results.module').then(m => m.ResultsModule) },
  { path: 'type-one-report', loadChildren: () => import('./pages/type-one-report/type-one-report.module').then(m => m.TypeOneReportModule) },
  { path: '**', pathMatch: 'full', redirectTo: 'result' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
