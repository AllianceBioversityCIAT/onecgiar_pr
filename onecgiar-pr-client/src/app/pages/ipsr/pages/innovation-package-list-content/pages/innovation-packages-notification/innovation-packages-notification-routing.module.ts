import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationPackagesNotificationComponent } from './innovation-packages-notification.component';

const routes: Routes = [{ path: '', component: InnovationPackagesNotificationComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationPackagesNotificationRoutingModule { }
