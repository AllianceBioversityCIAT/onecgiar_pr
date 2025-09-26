import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingCardItemComponent } from './components/result-framework-reporting-card-item/result-framework-reporting-card-item.component';
import { ResultFrameworkReportingRecentItemComponent } from './components/result-framework-reporting-recent-item/result-framework-reporting-recent-item.component';
import { SPProgress } from '../../../../shared/interfaces/SP-progress.interface';

@Component({
  selector: 'app-result-framework-reporting-home',
  imports: [CommonModule, ProgressBarModule, ResultFrameworkReportingCardItemComponent, ResultFrameworkReportingRecentItemComponent],
  templateUrl: './result-framework-reporting-home.component.html',
  styleUrl: './result-framework-reporting-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingHomeComponent implements OnInit {
  api = inject(ApiService);

  mySPsList = signal<SPProgress[]>([]);
  otherSPsList = signal<SPProgress[]>([]);

  recentActivityList = signal<{ title: string; description: string; time: string }[]>([
    {
      title: 'Breeding for tomorrow',
      description: 'The result 129 has been created by María Rodriguez.',
      time: '1 hour'
    },
    {
      title: 'Sustainable Animal and Aquatic Foods ',
      description: 'The result 130 has been deleted by Alice Johnson.',
      time: '30 minutes'
    },
    {
      title: 'Gender Equality and Inclusion ',
      description: 'The result 131 has been created by John Smith.',
      time: '10 minutes'
    },
    {
      title: 'Health and Well-being',
      description: 'The result 132 has been reviewed by Carlos Perez.',
      time: '10 minutes'
    },
    {
      title: 'Gender Equality and Inclusion ',
      description: 'The result 132 has been created by John Smith.',
      time: '10 minutes'
    }
  ]);

  ngOnInit() {
    this.getScienceProgramsProgress();
  }

  getScienceProgramsProgress() {
    this.api.resultsSE.GET_ScienceProgramsProgress().subscribe(({ response }) => {
      this.mySPsList.set(response?.mySciencePrograms);
      this.otherSPsList.set(response?.otherSciencePrograms);
    });
  }
}
