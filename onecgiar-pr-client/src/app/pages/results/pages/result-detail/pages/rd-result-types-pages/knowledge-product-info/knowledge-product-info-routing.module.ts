import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';
import { UnsavedChangesGuard } from '../../../../../../../shared/guards/unsaved-changes.guard';

// `UCA-T-11`: attach `canDeactivate` to THIS inner `{path: '', component: X}` route — NOT to the
// outer `rdResultTypesPages`/`resultDetailRouting` entry (that one has `loadChildren` and no
// `component`, so the guard would run against `component: null` and `TypeError` on every
// navigation; see `docs/specs/changes/unsaved-changes-alert/execution.md`).
const routes: Routes = [{ path: '', component: KnowledgeProductInfoComponent, canDeactivate: [UnsavedChangesGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KnowledgeProductInfoRoutingModule {}
