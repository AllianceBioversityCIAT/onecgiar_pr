import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorInitProgressAndKeyResultsComponent } from './tor-init-progress-and-key-results.component';

const routes: Routes = [{ path: '', component: TorInitProgressAndKeyResultsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorInitProgressAndKeyResultsRoutingModule {}
