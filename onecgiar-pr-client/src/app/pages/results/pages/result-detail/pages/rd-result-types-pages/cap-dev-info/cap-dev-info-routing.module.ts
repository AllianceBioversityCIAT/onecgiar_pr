import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CapDevInfoComponent } from './cap-dev-info.component';
import { UnsavedChangesGuard } from '../../../../../../../shared/guards/unsaved-changes.guard';

// `UCA-T-11` — `canDeactivate` lives on THIS inner route, not on the outer `rdResultTypesPages`
// entry (which uses `loadChildren` and has no `component`). Angular's router treats those as two
// separate route nodes; a `canDeactivate` on the outer node is invoked with `component: null`,
// and `UnsavedChangesGuard.canDeactivate()` dereferences `component.hasUnsavedChanges()`
// unguarded — that would `TypeError` on every navigation away from this section. See
// `docs/specs/changes/unsaved-changes-alert/` (cross-cutting routing correction).
const routes: Routes = [{ path: '', component: CapDevInfoComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CapDevInfoRoutingModule {}
