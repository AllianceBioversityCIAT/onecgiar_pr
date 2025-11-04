import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';

const routes: Routes = [{ path: '', component: RdContributorsAndPartnersComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdContributorsAndPartnersRoutingModule {}
