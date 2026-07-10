import { inject, Injectable, signal } from '@angular/core';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { SPProgress } from '../../../../../shared/interfaces/SP-progress.interface';

export function isAvisaScienceProgram(sp: SPProgress | null | undefined): boolean {
  if (!sp) {
    return false;
  }

  return sp.initiativeId === 41 || sp.initiativeCode === 'SGP-02' || sp.initiativeCode === 'SGP02';
}

export function partitionScienceProgramsForHome(response?: {
  mySciencePrograms?: SPProgress[];
  otherSciencePrograms?: SPProgress[];
}): {
  mySciencePrograms: SPProgress[];
  otherSciencePrograms: SPProgress[];
  otherProjects: SPProgress[];
} {
  const my = [...(response?.mySciencePrograms ?? [])];
  const other = [...(response?.otherSciencePrograms ?? [])];
  const otherProjectsById = new Map<number, SPProgress>();

  for (const sp of [...my, ...other]) {
    if (isAvisaScienceProgram(sp)) {
      otherProjectsById.set(sp.initiativeId, sp);
    }
  }

  return {
    mySciencePrograms: my.filter((sp) => !isAvisaScienceProgram(sp)),
    otherSciencePrograms: other.filter((sp) => !isAvisaScienceProgram(sp)),
    otherProjects: Array.from(otherProjectsById.values()),
  };
}

@Injectable({
  providedIn: 'root'
})
export class ResultFrameworkReportingHomeService {
  api = inject(ApiService);
  recentActivityList = signal<RecentActivity[]>([]);

  mySPsList = signal<SPProgress[]>([]);
  otherSPsList = signal<SPProgress[]>([]);
  otherProjectsList = signal<SPProgress[]>([]);

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
      const partitioned = partitionScienceProgramsForHome(response);
      this.mySPsList.set(partitioned.mySciencePrograms);
      this.otherSPsList.set(partitioned.otherSciencePrograms);
      this.otherProjectsList.set(partitioned.otherProjects);
      this.isLoadingSPLists.set(false);
    });
  }
}
