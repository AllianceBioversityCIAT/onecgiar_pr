import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OutcomeIndicatorHomeComponent } from './outcome-indicator-home.component';

const routes: Routes = [{ path: '', component: OutcomeIndicatorHomeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OutcomeIndicatorHomeRoutingModule {}
