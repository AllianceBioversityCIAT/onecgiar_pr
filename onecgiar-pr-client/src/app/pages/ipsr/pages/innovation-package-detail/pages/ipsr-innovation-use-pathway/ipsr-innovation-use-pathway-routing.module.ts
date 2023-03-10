import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrInnovationUsePathwayComponent } from './ipsr-innovation-use-pathway.component';

const routes: Routes = [{ path: '', component: IpsrInnovationUsePathwayComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrInnovationUsePathwayRoutingModule {}
