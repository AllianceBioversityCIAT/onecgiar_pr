import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResultsNotificationsComponent } from './results-notifications.component';

const routes: Routes = [{ path: '', component: ResultsNotificationsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResultsNotificationsRoutingModule {}
