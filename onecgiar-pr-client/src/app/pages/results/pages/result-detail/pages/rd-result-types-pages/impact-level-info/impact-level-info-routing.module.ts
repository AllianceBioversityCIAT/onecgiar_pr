import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ImpactLevelInfoComponent } from './impact-level-info.component';
import { UnsavedChangesGuard } from '../../../../../../../shared/guards/unsaved-changes.guard';

// `canDeactivate` lives on THIS inner route, not on the outer `resultDetailRouting` entry
// (`loadChildren`, no `component`): there the guard would receive `component: null`.
// Same wiring as `policy-change-info-routing.module.ts`.
const routes: Routes = [{ path: '', component: ImpactLevelInfoComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ImpactLevelInfoRoutingModule {}
