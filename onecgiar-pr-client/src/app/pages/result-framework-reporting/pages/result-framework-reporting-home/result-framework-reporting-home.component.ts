import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingCardItemComponent } from './components/result-framework-reporting-card-item/result-framework-reporting-card-item.component';
import { ResultFrameworkReportingRecentItemComponent } from './components/result-framework-reporting-recent-item/result-framework-reporting-recent-item.component';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { SkeletonModule } from 'primeng/skeleton';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { AlertGlobalInfoModule } from '../../../../shared/components/alert-global-info/alert-global-info.module';

@Component({
  selector: 'app-result-framework-reporting-home',
  imports: [
    CommonModule,
    ProgressBarModule,
    ResultFrameworkReportingCardItemComponent,
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
  resultFrameworkReportingHomeService = inject(ResultFrameworkReportingHomeService);
}
