import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TheoryOfChangeComponent } from './theory-of-change.component';

const routes: Routes = [{ path: '', component: TheoryOfChangeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TheoryOfChangeRoutingModule {}
