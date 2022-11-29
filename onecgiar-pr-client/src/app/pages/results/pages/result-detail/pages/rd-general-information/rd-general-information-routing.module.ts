import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdGeneralInformationComponent } from './rd-general-information.component';

const routes: Routes = [{ path: '', component: RdGeneralInformationComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdGeneralInformationRoutingModule {}
