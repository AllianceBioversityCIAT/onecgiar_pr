import { NgModule } from '@angular/core';
import { OutcomeIndicatorComponent } from './outcome-indicator.component';
import { OutcomeIndicatorRouting } from '../../shared/routing/routing-data';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [{ path: '', component: OutcomeIndicatorComponent, children: OutcomeIndicatorRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OutcomeIndicatorRoutingModule {}
