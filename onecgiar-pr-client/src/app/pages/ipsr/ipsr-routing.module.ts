import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrComponent } from './ipsr.component';

const routes: Routes = [{ path: '', component: IpsrComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrRoutingModule {}
