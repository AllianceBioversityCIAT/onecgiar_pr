import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../shared/services/api/api.service';
import { SPProgress } from '../../shared/interfaces/SP-progress.interface';
import {
  ResultFrameworkReportingHomeService,
  partitionScienceProgramsForHome
} from '../result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';

/**
 * Where a user with at least one assigned science program lands: the program's own page,
 * addressed by its CODE in the path (`…/entity-details/SP01`) — the shape prtest already
 * uses and that people have saved as links. Deliberately NOT `planned-toc?sp=<id>`.
 */
export const LANDING_PROGRAM_PATH = '/result-framework-reporting/entity-details';

/** Where a user with no assigned science program lands: the Results Center table. */
export const LANDING_FALLBACK_PATH = '/result/results-outlet/results-list';

/**
 * Session entry point.
 *
 * Opening the app (`/`, or any unmatched URL) must land the user on the FIRST science
 * program assigned to them — the same destination as clicking its sidebar card — and,
 * when the user has no assigned program, on the Results Center table where results are
 * actually reported. The retired behaviour (always opening the RFR dashboard) is gone;
 * `/result-framework-reporting/home` still resolves for anyone holding a saved link.
 */
@Component({
  selector: 'app-landing-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[var(--pr-surface-app)]">
      <div
        class="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--pr-color-primary-100)] border-t-[var(--pr-color-primary-300)]"
        role="status"
        aria-label="Loading your workspace"></div>
      <p class="text-[13px] font-medium text-[var(--pr-color-neutral-600)]">{{ message() }}</p>
    </div>
  `
})
export class LandingRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly message = signal('Opening your workspace…');

  ngOnInit(): void {
    const cached = this.homeSE.mySPsList();

    if (cached?.length) {
      this.goToFirstProgram(cached);
      return;
    }

    const subscription = this.api.resultsSE.GET_ScienceProgramsProgress().subscribe({
      next: ({ response }) => {
        const partitioned = partitionScienceProgramsForHome(response);
        this.homeSE.mySPsList.set(partitioned.mySciencePrograms);
        this.homeSE.otherSPsList.set(partitioned.otherSciencePrograms);
        this.homeSE.otherProjectsList.set(partitioned.otherProjects);
        this.goToFirstProgram(partitioned.mySciencePrograms);
      },
      // A failed lookup must never strand the user on a spinner: fall back to the
      // Results Center, which every authenticated user can open.
      error: () => this.goToResultsCenter()
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  private goToFirstProgram(programs: SPProgress[]): void {
    const first = programs?.[0];

    // The route segment is the programme CODE (`SP01`), not the numeric id.
    if (!first?.initiativeCode) {
      this.goToResultsCenter();
      return;
    }

    this.router.navigate([LANDING_PROGRAM_PATH, first.initiativeCode], { replaceUrl: true });
  }

  private goToResultsCenter(): void {
    this.message.set('Opening the Results Center…');
    this.router.navigate([LANDING_FALLBACK_PATH], { replaceUrl: true });
  }
}
