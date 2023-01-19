import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InitCompletenessStatusComponent } from './init-completeness-status.component';

const routes: Routes = [{ path: '', component: InitCompletenessStatusComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InitCompletenessStatusRoutingModule {}
