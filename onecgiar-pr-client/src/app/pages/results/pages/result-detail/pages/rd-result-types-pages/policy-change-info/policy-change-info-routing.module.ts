import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PolicyChangeInfoComponent } from './policy-change-info.component';

const routes: Routes = [{ path: '', component: PolicyChangeInfoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PolicyChangeInfoRoutingModule {}
