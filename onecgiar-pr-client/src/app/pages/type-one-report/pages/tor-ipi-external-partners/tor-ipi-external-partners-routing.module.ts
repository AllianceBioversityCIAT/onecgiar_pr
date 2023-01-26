import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorIpiExternalPartnersComponent } from './tor-ipi-external-partners.component';

const routes: Routes = [{ path: '', component: TorIpiExternalPartnersComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorIpiExternalPartnersRoutingModule {}
