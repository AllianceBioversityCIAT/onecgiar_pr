import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdEvidencesComponent } from './rd-evidences.component';

const routes: Routes = [{ path: '', component: RdEvidencesComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdEvidencesRoutingModule {}
