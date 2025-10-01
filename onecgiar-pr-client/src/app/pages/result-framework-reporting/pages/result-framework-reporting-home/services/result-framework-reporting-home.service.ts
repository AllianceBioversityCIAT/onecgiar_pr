import { inject, Injectable, signal } from '@angular/core';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { SPProgress } from '../../../../../shared/interfaces/SP-progress.interface';

@Injectable({
  providedIn: 'root'
})
export class ResultFrameworkReportingHomeService {
  api = inject(ApiService);
  recentActivityList = signal<RecentActivity[]>([]);
  mySPsList = signal<SPProgress[]>([]);
  otherSPsList = signal<SPProgress[]>([]);

  getRecentActivity() {
    this.api.resultsSE.GET_RecentActivity().subscribe(({ response }) => {
      this.recentActivityList.set(response);
    });
  }

  getScienceProgramsProgress() {
    this.api.resultsSE.GET_ScienceProgramsProgress().subscribe(({ response }) => {
      this.mySPsList.set(response?.mySciencePrograms);
      this.otherSPsList.set(response?.otherSciencePrograms);
    });
  }
}
