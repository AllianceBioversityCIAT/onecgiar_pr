import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SentRequestsComponent } from './sent-requests.component';

const routes: Routes = [{ path: '', component: SentRequestsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SentRequestsRoutingModule {}
