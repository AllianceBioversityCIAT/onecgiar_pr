import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { initadminModuleRouting } from '../../shared/routing/routing-data';

const routes: Routes = [{ path: '', component: InitAdminSectionComponent, children: initadminModuleRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InitAdminSectionRoutingModule {}
