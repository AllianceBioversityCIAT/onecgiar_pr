import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingCardItemComponent } from './components/result-framework-reporting-card-item/result-framework-reporting-card-item.component';
import { ResultFrameworkReportingRecentItemComponent } from './components/result-framework-reporting-recent-item/result-framework-reporting-recent-item.component';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';

@Component({
  selector: 'app-result-framework-reporting-home',
  imports: [CommonModule, ProgressBarModule, ResultFrameworkReportingCardItemComponent, ResultFrameworkReportingRecentItemComponent],
  templateUrl: './result-framework-reporting-home.component.html',
  styleUrl: './result-framework-reporting-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingHomeComponent implements OnInit {
  api = inject(ApiService);
  resultFrameworkReportingHomeService = inject(ResultFrameworkReportingHomeService);

  mySPsList = signal<SPProgress[]>([]);
  otherSPsList = signal<SPProgress[]>([]);

  ngOnInit() {
    this.getScienceProgramsProgress();
    this.resultFrameworkReportingHomeService.getRecentActivity();
  }

  getScienceProgramsProgress() {
    this.api.resultsSE.GET_ScienceProgramsProgress().subscribe(({ response }) => {
      this.mySPsList.set(response?.mySciencePrograms);
      this.otherSPsList.set(response?.otherSciencePrograms);
    });
  }
}
