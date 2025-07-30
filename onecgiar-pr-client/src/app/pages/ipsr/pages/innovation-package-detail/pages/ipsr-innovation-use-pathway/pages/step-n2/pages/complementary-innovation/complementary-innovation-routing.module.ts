import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComplementaryInnovationComponent } from './complementary-innovation.component';

const routes: Routes = [{ path: '', component: ComplementaryInnovationComponent}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComplementaryInnovationRoutingModule { }
