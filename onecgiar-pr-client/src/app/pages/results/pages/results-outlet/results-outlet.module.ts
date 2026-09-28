import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ResultsOutletRoutingModule } from './results-outlet-routing.module';
import { ResultsOutletComponent } from './results-outlet.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';

// Reviewer finding (NOTIF-T-18 follow-up): `PageHeaderComponent` was only used by the
// `<app-page-header>Results Center</app-page-header>` breadcrumb removed from this outlet's
// template per user request (2026-09-25) — dropped here too, nothing else in this module uses it.
@NgModule({
  declarations: [ResultsOutletComponent],
  imports: [CommonModule, RouterModule, ResultsOutletRoutingModule, CustomFieldsModule, AlertGlobalInfoModule]
})
export class ResultsOutletModule {}
