import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultCreatorComponent } from './result-creator.component';

const routes: Routes = [{path:'', component:ResultCreatorComponent}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultCreatorRoutingModule { }
