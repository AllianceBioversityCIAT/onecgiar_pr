import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorProgressEoioComponent } from './tor-progress-eoio.component';

const routes: Routes = [{ path: '', component: TorProgressEoioComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorProgressEoioRoutingModule {}
