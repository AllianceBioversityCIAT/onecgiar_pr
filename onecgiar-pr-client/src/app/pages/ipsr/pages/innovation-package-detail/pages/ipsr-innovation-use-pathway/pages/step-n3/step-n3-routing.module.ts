import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepN3Component } from './step-n3.component';
import { UnsavedChangesGuard } from '../../../../../../../../shared/guards/unsaved-changes.guard';

// P2-3427 (Ángel, 28-Sep-2026 review) — `canDeactivate` lives on THIS inner route, not on the outer
// `ipsrInnovationUsePathwayRouting` entry (`loadChildren`, no `component`): on the outer node the guard
// is invoked with `component: null` and `component.hasUnsavedChanges()` throws on every navigation.
const routes: Routes = [{ path: '', component: StepN3Component, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepN3RoutingModule {}
