import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { notificationsRouting } from '../../../../../../shared/routing/routing-data';

const routes: Routes = [{ path: '', component: ResultsNotificationsComponent, children: notificationsRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultsNotificationsRoutingModule {}
