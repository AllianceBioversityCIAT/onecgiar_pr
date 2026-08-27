import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingCardItemComponent } from './components/result-framework-reporting-card-item/result-framework-reporting-card-item.component';
import { ResultFrameworkReportingCenterCardItemComponent } from './components/result-framework-reporting-center-card-item/result-framework-reporting-center-card-item.component';
import { ResultFrameworkReportingInsightsComponent } from './components/result-framework-reporting-insights/result-framework-reporting-insights.component';
import { ResultFrameworkReportingRecentItemComponent } from './components/result-framework-reporting-recent-item/result-framework-reporting-recent-item.component';
import { ResultFrameworkReportingGalaxyComponent } from './components/result-framework-reporting-galaxy/result-framework-reporting-galaxy.component';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';
import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';
import { RolesService } from '../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-result-framework-reporting-home',
  imports: [
    CommonModule,
    ResultFrameworkReportingCardItemComponent,
    ResultFrameworkReportingCenterCardItemComponent,
    ResultFrameworkReportingInsightsComponent,
    ResultFrameworkReportingRecentItemComponent,
    ResultFrameworkReportingGalaxyComponent,
    CustomFieldsModule,
    AlertGlobalInfoModule,
    PrTooltipDirectiveModule
  ],
  templateUrl: './result-framework-reporting-home.component.html',
  styleUrl: './result-framework-reporting-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingHomeComponent {
  api = inject(ApiService);
  rolesSE = inject(RolesService);
  resultFrameworkReportingHomeService = inject(ResultFrameworkReportingHomeService);

  /** Toggles the full-screen 3D "Framework Galaxy" overlay. */
  readonly show3D = signal(false);

  // reportingCurrentPhase is a plain object; depend on the version signal so the
  // hero chip renders once phases finish loading (zoneless CD)
  readonly phaseLabel = computed(() => {
    this.api.dataControlSE.reportingPhaseVersion();
    const phase = this.api.dataControlSE.reportingCurrentPhase;
    return phase?.portfolioAcronym && phase?.phaseName ? `${phase.portfolioAcronym} · ${phase.phaseName}` : '';
  });

  readonly myCentersList = computed(() => this.rolesSE.getMyCenters());
}
