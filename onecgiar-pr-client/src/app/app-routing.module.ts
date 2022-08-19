import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'results', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'type-one-report', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'result-creator', loadChildren: () => import('./pages/result-creator/result-creator.module').then(m => m.ResultCreatorModule) },
  { path: '**', pathMatch: 'full', redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
