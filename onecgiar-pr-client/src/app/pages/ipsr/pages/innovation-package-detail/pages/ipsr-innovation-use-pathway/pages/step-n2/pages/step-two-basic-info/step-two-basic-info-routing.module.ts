import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { UnsavedChangesGuard } from '../../../../../../../../../../shared/guards/unsaved-changes.guard';

// P2-3427 (Ángel, 28-Sep-2026 review) — `canDeactivate` lives on THIS inner route, not on the outer
// `loadChildren` entry of the step (which has no `component`): Angular invokes a guard on that outer node
// with `component: null` and `UnsavedChangesGuard` dereferences `component.hasUnsavedChanges()` unguarded.
// Same placement as `rd-general-information-routing.module.ts`.
const routes: Routes = [{ path: '', component: StepTwoBasicInfoComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StepTwoBasicInfoRoutingModule { }
