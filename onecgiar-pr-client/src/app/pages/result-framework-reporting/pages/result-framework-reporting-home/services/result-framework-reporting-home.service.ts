import { inject, Injectable, signal } from '@angular/core';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { SPProgress } from '../../../../../shared/interfaces/SP-progress.interface';

const COMPACT_STORAGE_KEY = 'pr-rfr-home-compact';

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

  // Page-wide "compact view" preference: hides charts/metadata in the insights
  // widget AND the status breakdown inside every Science Program card.
  compactView = signal<boolean>(localStorage.getItem(COMPACT_STORAGE_KEY) === '1');

  toggleCompactView() {
    const next = !this.compactView();
    this.compactView.set(next);
    localStorage.setItem(COMPACT_STORAGE_KEY, next ? '1' : '0');
  }

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
