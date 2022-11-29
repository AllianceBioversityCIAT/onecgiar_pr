import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdPartnersComponent } from './rd-partners.component';

const routes: Routes = [{ path: '', component: RdPartnersComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdPartnersRoutingModule {}
