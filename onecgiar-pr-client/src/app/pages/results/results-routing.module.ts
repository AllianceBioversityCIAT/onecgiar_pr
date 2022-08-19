import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsComponent } from './results.component';

const routes: Routes = [
  {path:'', component:ResultsComponent, children:[
    { path: 'result-creator', loadChildren: () => import('./pages/result-creator/result-creator.module').then(m => m.ResultCreatorModule) },

  ]}]
  ;

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultsRoutingModule { }
