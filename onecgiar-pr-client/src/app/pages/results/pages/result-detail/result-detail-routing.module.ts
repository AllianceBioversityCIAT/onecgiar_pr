import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultDetailComponent } from './result-detail.component';

const routes: Routes = [{path:'', component:ResultDetailComponent}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultDetailRoutingModule { }
