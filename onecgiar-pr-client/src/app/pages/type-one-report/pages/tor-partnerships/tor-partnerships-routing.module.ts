import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorPartnershipsComponent } from './tor-partnerships.component';

const routes: Routes = [{ path: '', component: TorPartnershipsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorPartnershipsRoutingModule {}
