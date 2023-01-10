import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QualityAssuranceComponent } from './quality-assurance.component';

const routes: Routes = [{ path: '', component: QualityAssuranceComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QualityAssuranceRoutingModule {}
