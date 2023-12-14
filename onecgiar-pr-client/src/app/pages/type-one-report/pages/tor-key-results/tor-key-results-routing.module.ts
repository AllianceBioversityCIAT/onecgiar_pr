import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorKeyResultsComponent } from './tor-key-results.component';

const routes: Routes = [{ path: '', component: TorKeyResultsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorKeyResultsRoutingModule {}
