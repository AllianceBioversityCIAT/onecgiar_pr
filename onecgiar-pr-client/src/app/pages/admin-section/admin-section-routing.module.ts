import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminSectionComponent } from './admin-section.component';
import { adminModuleRouting } from '../../shared/routing/routing-data';

const routes: Routes = [{ path: '', component: AdminSectionComponent, children: adminModuleRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminSectionRoutingModule {}
