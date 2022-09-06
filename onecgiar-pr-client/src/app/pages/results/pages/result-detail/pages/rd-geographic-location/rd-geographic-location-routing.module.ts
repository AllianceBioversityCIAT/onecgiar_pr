import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdGeographicLocationComponent } from './rd-geographic-location.component';

const routes: Routes = [{ path: '', component: RdGeographicLocationComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdGeographicLocationRoutingModule {}
