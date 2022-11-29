import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationUseInfoComponent } from './innovation-use-info.component';

const routes: Routes = [{ path: '', component: InnovationUseInfoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationUseInfoRoutingModule {}
