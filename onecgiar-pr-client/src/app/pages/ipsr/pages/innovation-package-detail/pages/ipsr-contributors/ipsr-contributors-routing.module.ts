import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrContributorsComponent } from './ipsr-contributors.component';

const routes: Routes = [{ path: '', component: IpsrContributorsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrContributorsRoutingModule {}
