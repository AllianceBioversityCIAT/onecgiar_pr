import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdTheoryOfChangeComponent } from './rd-theory-of-change.component';

const routes: Routes = [{ path: '', component: RdTheoryOfChangeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdTheoryOfChangeRoutingModule {}
