import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';

const routes: Routes = [{ path: '', component: StepTwoBasicInfoComponent}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepTwoBasicInfoRoutingModule { }
