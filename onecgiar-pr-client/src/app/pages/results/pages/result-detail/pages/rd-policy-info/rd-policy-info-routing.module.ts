import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdPolicyInfoComponent } from './rd-policy-info.component';

const routes: Routes = [{ path: '', component: RdPolicyInfoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdPolicyInfoRoutingModule {}
