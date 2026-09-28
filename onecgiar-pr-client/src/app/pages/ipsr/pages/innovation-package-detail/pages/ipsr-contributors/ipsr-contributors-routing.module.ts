import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpsrContributorsComponent } from './ipsr-contributors.component';
import { UnsavedChangesGuard } from '../../../../../../shared/guards/unsaved-changes.guard';

// P2-3427 (Ángel, 28-Sep-2026 review) — `canDeactivate` lives on THIS inner route, not on the outer
// `IPSRDetailRouting` entry (which uses `loadChildren` and has no `component`). Angular treats those as
// two separate route nodes; on the outer one the guard receives `component: null` and throws. Same
// wiring as `rd-general-information-routing.module.ts` in Results.
const routes: Routes = [{ path: '', component: IpsrContributorsComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IpsrContributorsRoutingModule {}
