import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';

const routes: Routes = [{ path: '', component: IpsrGeneralInformationComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrGeneralInformationRoutingModule {}
