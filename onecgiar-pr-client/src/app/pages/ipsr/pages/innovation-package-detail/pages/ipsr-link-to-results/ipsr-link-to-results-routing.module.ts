import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrLinkToResultsComponent } from './ipsr-link-to-results.component';

const routes: Routes = [{ path: '', component: IpsrLinkToResultsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrLinkToResultsRoutingModule {}
