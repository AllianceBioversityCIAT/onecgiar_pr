import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';
import { CenterDto } from '../../../../shared/interfaces/center.dto';
import { resultStatusFg, resultStatusLabel } from '../../../../shared/constants/result-status-tokens';
import { ADMIN_ENTITIES_OVERVIEW_COPY } from '../../../../internationalization/admin-entities-overview.copy';
import {
  CENTER_STATUS_IDS,
  EntityOverviewRow,
  PROGRAM_STATUS_IDS,
  buildCenterRow,
  buildProgramRows,
  sumRows
} from './entities-overview.aggregate';

type LoadState = 'loading' | 'ready' | 'error';

interface CenterRowState {
  code: string;
  acronym: string;
  fullName: string;
  link: string;
  state: LoadState;
  row: EntityOverviewRow | null;
}

/**
 * P2-3858 (INC-163934-2) — Admin › All P/As and Centers: a draft of one page with the Overview numbers of
 * every Program/Accelerator and every CGIAR Center, for the open P25 reporting phase. Admin-only through
 * the `admin-module` parent route's `CheckAdminGuard`. Read-only: it only issues GETs.
 */
@Component({
  selector: 'app-entities-overview',
  imports: [RouterLink],
  templateUrl: './entities-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntitiesOverviewComponent {
  private readonly api = inject(ApiService);
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly centersService = inject(CentersService);
  private readonly phasesService = inject(PhasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly copy = ADMIN_ENTITIES_OVERVIEW_COPY;
  readonly programStatusIds = PROGRAM_STATUS_IDS;
  readonly centerStatusIds = CENTER_STATUS_IDS;
  readonly statusLabel = resultStatusLabel;
  readonly statusFg = resultStatusFg;
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly phase = signal<Phases | null>(null);
  readonly phaseResolved = signal(false);
  readonly versionId = computed(() => (this.phase() ? Number(this.phase()!.id) : null));

  readonly programsState = signal<LoadState>('loading');
  readonly programRows = signal<EntityOverviewRow[]>([]);
  readonly programTotals = computed(() => sumRows(this.programRows(), PROGRAM_STATUS_IDS.length));

  readonly centersListState = signal<LoadState>('loading');
  readonly centerRows = signal<CenterRowState[]>([]);
  readonly centerTotals = computed(() =>
    sumRows(
      this.centerRows()
        .map(center => center.row)
        .filter((row): row is EntityOverviewRow => row !== null),
      CENTER_STATUS_IDS.length
    )
  );
  readonly centersPartial = computed(() => this.centerRows().some(center => center.state === 'error'));

  constructor() {
    this.resolvePhase();

    // Both tables load once the phase is known (or known to be missing). The loads run untracked so the
    // signals they read (the centres catalogue among them) never re-trigger this effect into a second fetch.
    effect(() => {
      if (!this.phaseResolved()) return;
      const versionId = this.versionId();
      untracked(() => {
        this.loadPrograms(versionId);
        void this.loadCenters(versionId);
      });
    });
  }

  retryPrograms(): void {
    if (this.programsState() === 'loading') return;
    this.loadPrograms(this.versionId());
  }

  retryCentersList(): void {
    if (this.centersListState() === 'loading') return;
    void this.loadCenters(this.versionId());
  }

  retryCenter(code: string): void {
    const center = this.centerRows().find(item => item.code === code);
    if (!center || center.state === 'loading') return;
    this.loadCenter(center, this.versionId());
  }

  private resolvePhase(): void {
    const pick = (phases: Phases[]) => {
      const p25 = phases.filter(phase => phase.obj_portfolio?.acronym === 'P25');
      const open = p25.find(phase => phase.status) ?? [...p25].sort((a, b) => (b.phase_year ?? 0) - (a.phase_year ?? 0))[0] ?? null;
      this.phase.set(open);
      this.phaseResolved.set(true);
    };

    if (this.phasesService.phases.reporting.length) {
      pick(this.phasesService.phases.reporting);
      return;
    }
    this.phasesService
      .getPhasesObservable()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: pick, error: () => pick([]) });
  }

  private loadPrograms(versionId: number | null): void {
    this.programsState.set('loading');
    this.api.resultsSE
      .GET_ScienceProgramsProgress(versionId ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ response }) => {
          this.programRows.set(buildProgramRows(response, versionId));
          this.programsState.set('ready');
        },
        error: () => this.programsState.set('error')
      });
  }

  private async loadCenters(versionId: number | null): Promise<void> {
    this.centersListState.set('loading');
    try {
      const centers: CenterDto[] = await this.centersService.getData();
      const states: CenterRowState[] = (centers ?? [])
        .filter(center => !!center?.code)
        .map(center => {
          const acronym = center.acronym || center.name || center.code;
          return {
            code: center.code,
            acronym,
            fullName: center.name || acronym,
            link: buildCenterRow(center.code, acronym, []).link,
            state: 'loading' as LoadState,
            row: null
          };
        })
        .sort((a, b) => a.acronym.localeCompare(b.acronym, undefined, { sensitivity: 'base' }));
      this.centerRows.set(states);
      this.centersListState.set('ready');
      states.forEach(center => this.loadCenter(center, versionId));
    } catch {
      this.centersListState.set('error');
    }
  }

  private loadCenter(center: CenterRowState, versionId: number | null): void {
    if (versionId === null) {
      this.patchCenter(center.code, { state: 'ready', row: buildCenterRow(center.code, center.acronym, []) });
      return;
    }
    this.patchCenter(center.code, { state: 'loading', row: null });
    this.bilateralApi
      .GET_bilateralCenterResults(center.code, versionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (envelope: any) =>
          this.patchCenter(center.code, { state: 'ready', row: buildCenterRow(center.code, center.acronym, envelope?.response ?? []) }),
        error: () => this.patchCenter(center.code, { state: 'error', row: null })
      });
  }

  private patchCenter(code: string, patch: Partial<CenterRowState>): void {
    this.centerRows.update(rows => rows.map(row => (row.code === code ? { ...row, ...patch } : row)));
  }
}
