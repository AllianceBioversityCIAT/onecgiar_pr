import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultDetailComponent } from './result-detail.component';

const routes: Routes = [{
  path: '', component: ResultDetailComponent,
  children: [
    { path: 'general-information', loadChildren: () => import('./pages/general-information/general-information.module').then(m => m.GeneralInformationModule) },
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultDetailRoutingModule { }
