import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrInnovationUsePathwayComponent } from './ipsr-innovation-use-pathway.component';
import { ipsrInnovationUsePathwayRouting } from '../../../router/routing-data-ipsr';

const routes: Routes = [{ path: '', component: IpsrInnovationUsePathwayComponent, children: ipsrInnovationUsePathwayRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrInnovationUsePathwayRoutingModule {}
