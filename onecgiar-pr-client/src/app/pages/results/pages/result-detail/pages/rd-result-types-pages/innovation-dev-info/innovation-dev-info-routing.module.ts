import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';

const routes: Routes = [{ path: '', component: InnovationDevInfoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationDevInfoRoutingModule {}
