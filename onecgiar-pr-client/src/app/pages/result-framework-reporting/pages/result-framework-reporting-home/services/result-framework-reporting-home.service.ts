import { inject, Injectable, signal } from '@angular/core';
import { RecentActivity } from '../../../../../shared/interfaces/recentActivity.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { SPProgress } from '../../../../../shared/interfaces/SP-progress.interface';
import { ScienceProgramIdService } from '../../../services/science-program-id.service';

const COMPACT_STORAGE_KEY = 'pr-rfr-home-compact';

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
  private readonly scienceProgramIdSE = inject(ScienceProgramIdService);
  recentActivityList = signal<RecentActivity[]>([]);

  mySPsList = signal<SPProgress[]>([]);
  otherSPsList = signal<SPProgress[]>([]);
  otherProjectsList = signal<SPProgress[]>([]);

  isLoadingSPLists = signal<boolean>(false);
  isLoadingRecentActivity = signal<boolean>(false);

  // Page-wide "compact view" preference: hides charts/metadata in the insights
  // widget AND the status breakdown inside every Science Program card.
  compactView = signal<boolean>(localStorage.getItem(COMPACT_STORAGE_KEY) === '1');

  // Overview tab phase selection shared with the Results tab
  overviewSelectedPhase = signal<string | null>(null);
  overviewSelectedProgram = signal<string | null>(null);
  overviewSelectedVersionId = signal<number | null>(null);

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

    // P2-3180: shared/session-cached request (`ScienceProgramIdService`) instead of calling
    // `GET_ScienceProgramsProgress()` directly — this list is fetched from both the sidebar
    // shell and this page, and each direct call re-issued the same request.
    this.scienceProgramIdSE.progress$.subscribe({
      next: ({ response }) => {
        const partitioned = partitionScienceProgramsForHome(response);
        this.mySPsList.set(partitioned.mySciencePrograms);
        this.otherSPsList.set(partitioned.otherSciencePrograms);
        this.otherProjectsList.set(partitioned.otherProjects);
        this.isLoadingSPLists.set(false);
      },
      error: () => this.isLoadingSPLists.set(false)
    });
  }
}
