// @akili-spec changes/results-center-reporting-guide (RCG-T-2, RCG-T-3)
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideZap } from '@ng-icons/lucide';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PrDialogComponent } from '../../../../../../../../shared/components/pr-dialog/pr-dialog.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { EntityAowService } from '../../../../../../../result-framework-reporting/pages/entity-aow/services/entity-aow.service';
import { isAvisaInitiative } from '../../../../../../../../shared/utils/avisa-initiative.util';
import { buildRatio } from '../../../../../../../result-framework-reporting/pages/dashboard-lab/reporting-burndown';
import { buildReportedResultsByProjectId } from '../../../../../../../result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub/reporting-entry-hub.util';
import {
  HubAowRow,
  HubProgramLevelKind,
  HubProgramLevelRow,
  HubW3Data,
  HubW3State,
  ReportingEntryHubComponent
} from '../../../../../../../result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub/reporting-entry-hub.component';
import { HUB_COPY } from '../../../../../../../result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub/hub-copy';
import { PlatformReportingGuideService } from '../../services/platform-reporting-guide.service';
import { PLATFORM_GUIDE_COPY } from './platform-guide-copy';

@Component({
  selector: 'app-results-center-reporting-guide',
  standalone: true,
  templateUrl: './results-center-reporting-guide.component.html',
  styleUrls: ['./results-center-reporting-guide.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, PrDialogComponent, ReportingEntryHubComponent, NgIcon],
  providers: [provideIcons({ lucideZap })]
})
export class ResultsCenterReportingGuideComponent {
  private readonly api = inject(ApiService);
  private readonly entityAowService = inject(EntityAowService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly guideService = inject(PlatformReportingGuideService);

  readonly visible = model<boolean>(false);
  readonly copy = HUB_COPY;
  readonly platformCopy = PLATFORM_GUIDE_COPY;

  readonly pickerSelection = model<string | null>(null);

  readonly showHub = computed(() => {
    const mode = this.guideService.modalMode();
    if (mode === 'hub') return !!this.guideService.selectedProgramCode();
    if (mode === 'pick-program') return !!this.guideService.selectedProgramCode();
    return false;
  });

  readonly isPickerStep = computed(
    () => this.guideService.modalMode() === 'pick-program' && !this.guideService.selectedProgramCode()
  );

  readonly dialogStyleClass = computed(() =>
    this.isPickerStep() ? 'rc-reporting-guide-dialog rc-reporting-guide-dialog--picker' : 'rc-reporting-guide-dialog'
  );

  readonly programCode = computed(() => this.guideService.selectedProgramCode() ?? '');

  readonly phaseLabel = computed(() => this.api.dataControlSE.reportingCurrentPhase?.phaseName ?? '');
  readonly activeYear = computed(() => this.api.dataControlSE.reportingCurrentPhase?.phaseYear ?? null);
  readonly isActivePhase = computed(() => {
    const activeYear = this.activeYear();
    const selectedYear = this.api.dataControlSE.reportingCurrentPhase?.phaseYear ?? null;
    return activeYear == null || selectedYear == null || activeYear === selectedYear;
  });
  readonly canReportW1W2 = computed(() => this.entityAowService.canReportResults());
  readonly canReportEmerging = computed(() => {
    const code = this.programCode();
    return !!code && !isAvisaInitiative({ official_code: code, initiativeCode: code });
  });
  readonly myCentersCount = computed(() => (this.api.rolesSE.getMyCenters() ?? []).length);
  readonly centerCount = computed(() => this.myCentersCount());

  readonly internalW3State = signal<HubW3State>({ status: 'loading' });
  readonly internalAowRows = signal<HubAowRow[]>([]);
  readonly internalProgramLevelRows = signal<HubProgramLevelRow[]>([]);
  readonly internalW1W2Loading = signal<boolean>(false);
  readonly internalReportedResultsByProjectId = signal<Map<string, number>>(new Map());

  private loadedCode: string | null = null;

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      if (isVisible) {
        this.guideService.refreshChoices();
      } else {
        this.guideService.reset();
        this.pickerSelection.set(null);
        this.loadedCode = null;
      }
    });

    effect(() => {
      const isVisible = this.visible();
      const code = this.guideService.selectedProgramCode();
      const showHub = this.showHub();
      if (isVisible && showHub && code && code !== this.loadedCode) {
        this.loadedCode = code;
        this.primeEntityAow(code);
        this.loadHubData(code);
      }
    });
  }

  closeModal(): void {
    this.visible.set(false);
  }

  onPickerContinue(): void {
    const code = this.pickerSelection();
    if (!code) return;
    this.guideService.selectProgram(code);
  }

  onRequestAccess(): void {
    const subject = encodeURIComponent(this.copy.requestAccessMailSubject);
    window.location.href = `mailto:?subject=${subject}`;
  }

  private primeEntityAow(code: string): void {
    if (!code || this.entityAowService.entityId() === code) return;
    this.entityAowService.entityId.set(code);
    this.entityAowService.getAllDetailsData(code);
  }

  private loadHubData(code: string): void {
    this.fetchW3(code);
    this.fetchW1W2(code);
  }

  private fetchW3(code: string): void {
    this.internalW3State.set({ status: 'loading' });
    this.internalReportedResultsByProjectId.set(new Map());
    const versionId = this.api.dataControlSE.reportingCurrentPhase?.phaseId;
    forkJoin({
      projects: this.api.resultsSE.GET_reportingEntryHubProjects(code),
      reported: this.api.resultsSE.GET_ResultToReview(code, undefined, versionId).pipe(catchError(() => of({ response: [] })))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ projects, reported }) => {
          this.internalReportedResultsByProjectId.set(buildReportedResultsByProjectId(reported?.response));
          const response = projects?.response as HubW3Data;
          const status = (response?.centers?.length ?? 0) === 0 ? 'no-centers' : 'ready';
          this.internalW3State.set({ status, data: response });
        },
        error: () => this.internalW3State.set({ status: 'error' })
      });
  }

  private fetchW1W2(code: string): void {
    this.internalW1W2Loading.set(true);
    const versionId = this.api.dataControlSE.reportingCurrentPhase?.phaseId;
    forkJoin({
      tocProgress: this.api.resultsSE.GET_ScienceProgramTocProgress(code, versionId).pipe(catchError(() => of(null))),
      intermediate: this.api.resultsSE.GET_IntermediateOutcomes(code, versionId).pipe(catchError(() => of(null))),
      outcomes2030: this.api.resultsSE.GET_2030Outcomes(code, versionId).pipe(catchError(() => of(null)))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tocProgress, intermediate, outcomes2030 }) => {
          const rawAreas = (tocProgress as any)?.response?.areas ?? [];
          const aowRows: HubAowRow[] = rawAreas
            .map((area: any) => ({
              code: area.code,
              name: area.name,
              done: area.progress?.done ?? 0,
              total: area.progress?.total ?? 0,
              zeroTarget: area.progress?.zeroTarget
            }))
            .sort((a: HubAowRow, b: HubAowRow) => {
              const pa = a.total ? a.done / a.total : 0;
              const pb = b.total ? b.done / b.total : 0;
              return pa - pb || a.code.localeCompare(b.code);
            });
          this.internalAowRows.set(aowRows);

          const intermediateRatio = buildRatio((intermediate as any)?.response?.tocResults?.flatMap((r: any) => r?.indicators ?? []) ?? []);
          const outcomes2030Ratio = buildRatio((outcomes2030 as any)?.response?.tocResults?.flatMap((r: any) => r?.indicators ?? []) ?? []);
          const programLevel: HubProgramLevelRow[] = [];
          if (intermediateRatio.total > 0 || intermediateRatio.zeroTarget > 0) {
            programLevel.push({
              kind: 'intermediate',
              name: 'Intermediate outcomes',
              done: intermediateRatio.done,
              total: intermediateRatio.total,
              zeroTarget: intermediateRatio.zeroTarget
            });
          }
          if (outcomes2030Ratio.total > 0 || outcomes2030Ratio.zeroTarget > 0) {
            programLevel.push({
              kind: '2030',
              name: '2030 outcomes',
              done: outcomes2030Ratio.done,
              total: outcomes2030Ratio.total,
              zeroTarget: outcomes2030Ratio.zeroTarget
            });
          }
          this.internalProgramLevelRows.set(programLevel);
          this.internalW1W2Loading.set(false);
        },
        error: () => {
          this.internalAowRows.set([]);
          this.internalProgramLevelRows.set([]);
          this.internalW1W2Loading.set(false);
        }
      });
  }

  retryW3(): void {
    const code = this.programCode();
    if (code) this.fetchW3(code);
  }

  onReportAow(code: string): void {
    this.closeModal();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programCode()], {
      queryParams: { tocView: 'byAow', tocAow: code }
    });
  }

  onReportProgramLevel(_kind: HubProgramLevelKind): void {
    this.closeModal();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programCode()], {
      queryParams: { tocView: 'aows' }
    });
  }

  onReportEmerging(): void {
    this.closeModal();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programCode()], {
      queryParams: { reportEmerging: 'true' }
    });
  }
}
