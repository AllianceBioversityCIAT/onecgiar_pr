import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RdLinksToResultsComponent } from './rd-links-to-results.component';
import { UnsavedChangesGuard } from '../../../../../../shared/guards/unsaved-changes.guard';

// `UCA-T-10` (routing fix) — `canDeactivate` lives on THIS inner route, not on the outer
// `resultDetailRouting` entry (which uses `loadChildren` and has no `component`). Angular's
// router treats those as two separate route nodes; a `canDeactivate` on the outer node is
// invoked with `component: null`, and `UnsavedChangesGuard.canDeactivate()` dereferences
// `component.hasUnsavedChanges()` unguarded — that threw on every navigation away from this
// section. See `docs/specs/changes/unsaved-changes-alert/`.
const routes: Routes = [{ path: '', component: RdLinksToResultsComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RdLinksToResultsRoutingModule {}
