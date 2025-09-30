import { inject, Injectable, signal } from '@angular/core';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ResultFrameworkReportingHomeService {
  api = inject(ApiService);
  recentActivityList = signal<RecentActivity[]>([]);

  getRecentActivity() {
    this.api.resultsSE.GET_RecentActivity().subscribe(({ response }) => {
      this.recentActivityList.set(response);
    });
  }
}
