// @akili-spec results/impact-results-reporting/sp-reporting-entry
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { HlmBadgeImports } from '@spartan/badge';
import { HlmSkeletonImports } from '@spartan/skeleton';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { IMPACT_AREAS, ImpactArea } from '../../../../shared/report-result/impact-areas.constant';

interface ImpactCounts {
  byArea: Record<number, number>;
  total: number;
}

let nextListId = 0;

type CountsParams = { initiativeId: number | string; versionId: number | string } | undefined;

/**
 * IRE-R-1..4: Impact results card. Owns the E6 request (IRE-DD-3), keyed on (initiativeId, versionId).
 * Presentation + one read; no progress/ratio/% by design.
 */
@Component({
  selector: 'app-impact-results-card',
  standalone: true,
  imports: [HlmBadgeImports, HlmSkeletonImports, NgIcon],
  providers: [provideIcons({ lucideChevronDown })],
  templateUrl: './impact-results-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImpactResultsCardComponent {
  private readonly resultsApi = inject(ResultsApiService);

  readonly initiativeId = input<number | string | null>(null);
  readonly versionId = input<number | string | null>(null);
  readonly canReport = input<boolean>(false);
  readonly reportArea = output<number>();

  readonly areas: ImpactArea[] = IMPACT_AREAS;

  /** ICC-R-1: local, not persisted, expanded on first render. Never read by the counts resource (ICC-R-3). */
  readonly expanded = signal(true);
  readonly listId = `impact-results-list-${nextListId++}`;

  toggle() {
    this.expanded.update(v => !v);
  }

  private readonly counts = rxResource<ImpactCounts, CountsParams>({
    params: () => {
      const initiativeId = this.initiativeId();
      const versionId = this.versionId();
      return initiativeId == null || versionId == null ? undefined : { initiativeId, versionId };
    },
    stream: ({ params }) =>
      params
        ? this.resultsApi.GET_impactLevelCounts(params.initiativeId, params.versionId).pipe(
            map(res => {
              const body = res?.response ?? res;
              const byArea: Record<number, number> = {};
              for (const row of body?.areas ?? []) byArea[Number(row.impact_area_id)] = Number(row.count) || 0;
              return { byArea, total: Number(body?.total) || 0 };
            })
          )
        : of({ byArea: {}, total: 0 })
  });

  readonly loading = computed(() => this.counts.isLoading());
  readonly loaded = computed(() => this.counts.status() === 'resolved' || this.counts.status() === 'local');
  readonly total = computed(() => (this.loaded() ? this.counts.value()!.total : null));

  countOf(areaId: number): number | null {
    return this.loaded() ? (this.counts.value()!.byArea[areaId] ?? 0) : null;
  }

  onReport(areaId: number) {
    this.reportArea.emit(areaId);
  }
}
