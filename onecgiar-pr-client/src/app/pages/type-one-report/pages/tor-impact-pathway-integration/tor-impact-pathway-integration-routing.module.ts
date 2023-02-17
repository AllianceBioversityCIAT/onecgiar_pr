import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorImpactPathwayIntegrationComponent } from './tor-impact-pathway-integration.component';

const routes: Routes = [{ path: '', component: TorImpactPathwayIntegrationComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorImpactPathwayIntegrationRoutingModule {}
