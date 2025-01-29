import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorProgressWpsComponent } from './tor-progress-wps.component';

const routes: Routes = [{ path: '', component: TorProgressWpsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorProgressWpsRoutingModule {}
