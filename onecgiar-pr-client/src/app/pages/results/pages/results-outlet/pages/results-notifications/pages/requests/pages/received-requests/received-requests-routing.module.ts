import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceivedRequestsComponent } from './received-requests.component';

const routes: Routes = [{ path: '', component: ReceivedRequestsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReceivedRequestsRoutingModule {}
