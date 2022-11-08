import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CapDevInfoComponent } from './cap-dev-info.component';

const routes: Routes = [{ path: '', component: CapDevInfoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CapDevInfoRoutingModule {}
