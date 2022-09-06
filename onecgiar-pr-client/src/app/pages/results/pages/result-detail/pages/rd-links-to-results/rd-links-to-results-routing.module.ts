import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdLinksToResultsComponent } from './rd-links-to-results.component';

const routes: Routes = [{ path: '', component: RdLinksToResultsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdLinksToResultsRoutingModule {}
