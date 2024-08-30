import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RequestsComponent } from './requests.component';
import { requestsNotificationsRouting } from '../../../../../../../../shared/routing/routing-data';

const routes: Routes = [{ path: '', component: RequestsComponent, children: requestsNotificationsRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RequestsRoutingModule {}
