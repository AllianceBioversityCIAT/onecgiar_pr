import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationDevInfoComponent } from './innovation-dev-info.component';
import { UnsavedChangesGuard } from '../../../../../../../shared/guards/unsaved-changes.guard';

// `UCA-T-11` (routing fix, cross-cutting per execution.md) — `canDeactivate` lives on THIS inner
// route, not on the outer `rdResultTypesPages` entry (which uses `loadChildren` and has no
// `component`). Angular's router treats those as two separate route nodes; a `canDeactivate` on
// the outer node is invoked with `component: null`, and `UnsavedChangesGuard.canDeactivate()`
// dereferences `component.hasUnsavedChanges()` unguarded — that threw on every navigation away
// from a section wired this way. See `docs/specs/changes/unsaved-changes-alert/`.
const routes: Routes = [{ path: '', component: InnovationDevInfoComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationDevInfoRoutingModule {}
