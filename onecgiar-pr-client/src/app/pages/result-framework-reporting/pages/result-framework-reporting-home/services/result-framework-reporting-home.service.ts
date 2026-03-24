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

  isLoadingSPLists = signal<boolean>(false);
  isLoadingRecentActivity = signal<boolean>(false);

  getRecentActivity() {
    this.isLoadingRecentActivity.set(true);

    this.api.resultsSE.GET_RecentActivity().subscribe(({ response }) => {
      this.recentActivityList.set(response);
      this.isLoadingRecentActivity.set(false);
    });
  }

  getScienceProgramsProgress() {
    this.isLoadingSPLists.set(true);

    this.api.resultsSE.GET_ScienceProgramsProgress().subscribe(({ response }) => {
      this.mySPsList.set(response?.mySciencePrograms);
      this.otherSPsList.set(response?.otherSciencePrograms);
      this.isLoadingSPLists.set(false);
    });
  }
}
