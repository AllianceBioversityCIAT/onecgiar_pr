import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingCardItemComponent } from './components/result-framework-reporting-card-item/result-framework-reporting-card-item.component';
import { ResultFrameworkReportingCenterCardItemComponent } from './components/result-framework-reporting-center-card-item/result-framework-reporting-center-card-item.component';
import { ResultFrameworkReportingRecentItemComponent } from './components/result-framework-reporting-recent-item/result-framework-reporting-recent-item.component';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { SkeletonModule } from 'primeng/skeleton';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';
import { RolesService } from '../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-result-framework-reporting-home',
  imports: [
    CommonModule,
    ProgressBarModule,
    ResultFrameworkReportingCardItemComponent,
    ResultFrameworkReportingCenterCardItemComponent,
    ResultFrameworkReportingRecentItemComponent,
    SkeletonModule,
    CustomFieldsModule,
    AlertGlobalInfoModule
  ],
  templateUrl: './result-framework-reporting-home.component.html',
  styleUrl: './result-framework-reporting-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingHomeComponent {
  api = inject(ApiService);
  rolesSE = inject(RolesService);
  resultFrameworkReportingHomeService = inject(ResultFrameworkReportingHomeService);

  myCentersList = computed(() => this.rolesSE.getMyCenters());
}
