import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrComponent } from './ipsr.component';
import { IPSRRouting } from './pages/router/routing-data-ipsr';

const routes: Routes = [{ path: '', component: IpsrComponent, children: IPSRRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrRoutingModule {}
