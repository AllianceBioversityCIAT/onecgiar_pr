// @akili-spec changes/reporting-entry-hub
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { EntityAowService } from '../../../entity-aow/services/entity-aow.service';
import { BilateralCreationService } from '../../../../../bilateral/services/bilateral-creation.service';
import { BilateralProject } from '../../../../../bilateral/services/bilateral-creation.interfaces';
import { PrDialogComponent } from '../../../../../../shared/components/pr-dialog/pr-dialog.component';
import { isAvisaInitiative } from '../../../../../../shared/utils/avisa-initiative.util';
import { buildRatio } from '../../reporting-burndown';
import {
  HubAowRow,
  HubCreateResultEvent,
  HubProgramLevelKind,
  HubProgramLevelRow,
  HubW3Data,
  HubW3State,
  ReportingEntryHubComponent
} from '../reporting-entry-hub/reporting-entry-hub.component';

@Component({
  selector: 'app-where-to-report-modal',
  standalone: true,
  templateUrl: './where-to-report-modal.component.html',
  styleUrls: ['./where-to-report-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PrDialogComponent, ReportingEntryHubComponent]
})
export class WhereToReportModalComponent {
  private readonly api = inject(ApiService);
  private readonly dataControlSE = inject(DataControlService);
  private readonly entityAowService = inject(EntityAowService);
  private readonly bilateralCreationSE = inject(BilateralCreationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model<boolean>(false);
  readonly programCode = input.required<string>();
  readonly returnTab = input<string | null>(null);

  // Optional overrides if parent already computed them
  readonly customPhaseLabel = input<string | null>(null);
  readonly customActiveYear = input<number | null>(null);
  readonly customAowRows = input<HubAowRow[] | null>(null);
  readonly customProgramLevelRows = input<HubProgramLevelRow[] | null>(null);
  readonly customW3State = input<HubW3State | null>(null);

  readonly phaseLabel = computed(() => this.customPhaseLabel() ?? this.dataControlSE.reportingCurrentPhase?.phaseName ?? '');
  readonly activeYear = computed(() => this.customActiveYear() ?? this.dataControlSE.reportingCurrentPhase?.phaseYear ?? null);
  readonly isActivePhase = computed(() => {
    const activeYear = this.activeYear();
    const selectedYear = this.dataControlSE.reportingCurrentPhase?.phaseYear ?? null;
    return activeYear == null || selectedYear == null || activeYear === selectedYear;
  });
  readonly canReportW1W2 = computed(() => this.entityAowService.canReportResults());
  readonly canReportEmerging = computed(() => {
    const code = this.programCode();
    return !!code && !isAvisaInitiative({ official_code: code, initiativeCode: code });
  });
  readonly myCentersCount = computed(() => (this.api.rolesSE.getMyCenters() ?? []).length);

  readonly internalW3State = signal<HubW3State>({ status: 'loading' });
  readonly internalAowRows = signal<HubAowRow[]>([]);
  readonly internalProgramLevelRows = signal<HubProgramLevelRow[]>([]);
  readonly internalW1W2Loading = signal<boolean>(false);

  readonly w3State = computed(() => this.customW3State() ?? this.internalW3State());
  readonly aowRows = computed(() => this.customAowRows() ?? this.internalAowRows());
  readonly programLevelRows = computed(() => this.customProgramLevelRows() ?? this.internalProgramLevelRows());
  readonly w1w2Loading = computed(() => this.internalW1W2Loading());

  private loadedCode: string | null = null;

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const code = this.programCode();
      if (isVisible && code && code !== this.loadedCode) {
        this.loadedCode = code;
        this.loadHubData(code);
      }
    });
  }

  private loadHubData(code: string): void {
    if (!this.customW3State()) {
      this.fetchW3(code);
    }
    if (!this.customAowRows() || !this.customProgramLevelRows()) {
      this.fetchW1W2(code);
    }
  }

  private fetchW3(code: string): void {
    this.internalW3State.set({ status: 'loading' });
    this.api.resultsSE.GET_reportingEntryHubProjects(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ response }: { response: HubW3Data }) => {
          const status = (response?.centers?.length ?? 0) === 0 ? 'no-centers' : 'ready';
          this.internalW3State.set({ status, data: response });
        },
        error: () => this.internalW3State.set({ status: 'error' })
      });
  }

  private fetchW1W2(code: string): void {
    this.internalW1W2Loading.set(true);
    const versionId = this.dataControlSE.reportingCurrentPhase?.phaseId;
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

  closeModal(): void {
    this.visible.set(false);
  }

  onReportAow(code: string): void {
    this.closeModal();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programCode()], {
      queryParams: { tocView: 'byAow', tocAow: code }
    });
  }

  onReportProgramLevel(kind: HubProgramLevelKind): void {
    this.closeModal();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programCode()], {
      queryParams: { tocView: 'aows' }
    });
  }

  onReportEmerging(): void {
    this.closeModal();
    const queryParams: Record<string, string> = { reportEmerging: 'true' };
    const tab = this.returnTab();
    if (tab) queryParams['returnTab'] = tab;
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programCode()], {
      queryParams
    });
  }

  onCreateResult(event: HubCreateResultEvent): void {
    this.closeModal();
    if (!event?.center?.acronym) return;
    this.bilateralCreationSE.selectProject(event.project as unknown as BilateralProject);
    this.router.navigate(['/bilateral', event.center.acronym, 'create']);
  }
}
