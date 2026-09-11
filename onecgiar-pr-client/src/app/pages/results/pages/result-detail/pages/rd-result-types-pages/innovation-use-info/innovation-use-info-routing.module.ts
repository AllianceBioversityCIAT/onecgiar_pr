import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InnovationUseInfoComponent } from './innovation-use-info.component';
import { UnsavedChangesGuard } from '../../../../../../../shared/guards/unsaved-changes.guard';

// `UCA-T-11` — `canDeactivate` on THIS inner `{path: '', component}` route, never on the outer
// `rdResultTypesPages` entry in `routing-data.ts` (that one has `loadChildren` and no `component`,
// so Angular would invoke the guard with `component: null` — the cross-cutting bug fixed centrally,
// see `docs/specs/changes/unsaved-changes-alert/execution.md`).
const routes: Routes = [{ path: '', component: InnovationUseInfoComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InnovationUseInfoRoutingModule {}
