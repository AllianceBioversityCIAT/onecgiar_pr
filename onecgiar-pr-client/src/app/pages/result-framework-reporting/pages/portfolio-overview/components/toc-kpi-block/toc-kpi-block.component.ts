// @akili-spec changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure (TND-T-2)
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan/button';
import { HlmTooltip } from '@spartan/tooltip';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PortfolioTocCoverage } from '../../../../../../shared/interfaces/portfolio-toc-coverage.interface';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { FilterDimension } from '../../services/portfolio-filters';
import { filterRowsByPrograms, sumRows, toSummary, toViewRows } from './toc-kpi.format';

type LoadStatus = 'loading' | 'error' | 'ready';

/** Rows of the loading skeleton. A fixed number: the real count is unknown until the response lands. */
const SKELETON_ROWS = [0, 1, 2, 3, 4] as const;

/**
 * Progress against ToC KPIs, by Program / Accelerator (spec changes/portfolio-overview-revamp/toc-kpi-progress).
 * Owns its data path (TKP-DD-6): ONE portfolio-wide request per `versionId` and per Retry click, never one per P/A,
 * with switch-latest so a stale response cannot overwrite a newer one. It is independent of the page's own
 * request: a failure here shows the section error and leaves the rest of the page intact (S-7.1).
 * Read-only; the only interactive element of a row is the name button (TKP-R-6).
 */
@Component({
  selector: 'app-portfolio-toc-kpi-block',
  imports: [NgIcon, HlmTooltip, HlmButtonImports],
  providers: [provideIcons({ lucideChevronRight })],
  templateUrl: './toc-kpi-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioTocKpiBlockComponent {
  private readonly api = inject(ResultsApiService);

  /** Version (phase) of the page rows. `null` leaves the choice to the server (the active phase). */
  readonly versionId = input<number | null>(null);
  /** Reporting year shown in the subtitle. */
  readonly year = input<string>('');
  /** Selected Programs / Accelerators (codes). Empty = no Program filter. Narrows what is held; never refetches (GLF-R-6). */
  readonly programs = input<ReadonlySet<string>>(new Set<string>());
  /** Active filter dimensions this block does not honour, in bar order; computed by the page (GLF-R-9). */
  readonly notAffected = input<readonly FilterDimension[]>([]);
  /** Emits the official code of the Program / Accelerator whose Results tab the user asked to open. */
  readonly programmeOpen = output<string>();

  readonly copy = PORTFOLIO_OVERVIEW_COPY.tocKpi;
  readonly skeletonRows = SKELETON_ROWS;

  readonly status = signal<LoadStatus>('loading');
  private readonly data = signal<PortfolioTocCoverage | null>(null);

  readonly rows = computed(() => filterRowsByPrograms(toViewRows(this.data()?.programs ?? []), this.programs()));
  /** The server portfolio, or (Program filter on) the sum of the visible rows (GLF-P-5). */
  readonly summary = computed(() =>
    toSummary(this.programs().size ? sumRows(this.rows()) : (this.data()?.portfolio ?? { covered: 0, total: 0, noTarget: 0 }))
  );
  /** Sum of `noTarget` over the visible rows; feeds the empty-state text (TND-S-3.3). */
  readonly visibleNoTarget = computed(() => this.rows().reduce((sum, row) => sum + row.noTarget, 0));
  readonly notAffectedText = computed(() => {
    const list = this.notAffected();
    if (!list.length) return '';
    const names = PORTFOLIO_OVERVIEW_COPY.filters.dimensions;
    return PORTFOLIO_OVERVIEW_COPY.filters.notAffected(list.map(d => names[d]).join(', '));
  });
  /** TKP-R-7 Empty: every P/A has total = 0, or there are none. */
  readonly isEmpty = computed(() => this.rows().every(row => row.total === 0) || this.summary().percent === null);

  private readonly load$ = new Subject<number | null>();

  constructor() {
    // switchMap drops the previous in-flight call; the error is caught INSIDE it so the stream outlives a failure.
    // The error is deliberately not kept: nothing of it (message, status, URL) may reach the template (S-7.1 BUT).
    this.load$
      .pipe(
        switchMap(versionId =>
          this.api.GET_PortfolioTocCoverage(versionId ?? undefined).pipe(
            map(envelope => ({ ok: true as const, data: envelope?.response ?? null })),
            catchError(() => of({ ok: false as const }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.data.set(result.ok ? result.data : null);
        this.status.set(result.ok ? 'ready' : 'error');
      });

    // untracked: the request must depend on `versionId` only, never on the signals fetch() touches.
    effect(() => {
      const versionId = this.versionId();
      untracked(() => this.fetch(versionId));
    });
  }

  /** Re-requests after a failure. Only acts in the error state, so a double click is still one request. */
  retry(): void {
    if (this.status() !== 'error') return;
    this.fetch(this.versionId());
  }

  openProgramme(code: string): void {
    this.programmeOpen.emit(code);
  }

  private fetch(versionId: number | null): void {
    this.status.set('loading');
    this.load$.next(versionId);
  }
}
