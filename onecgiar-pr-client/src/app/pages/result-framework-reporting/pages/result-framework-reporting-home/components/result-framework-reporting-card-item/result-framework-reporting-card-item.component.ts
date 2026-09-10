import { ChangeDetectionStrategy, Component, inject, Input, signal } from '@angular/core';
import { SPProgress } from '../../../../../../shared/interfaces/SP-progress.interface';
import { RouterLink } from '@angular/router';
import { STATUS_META } from '../../status-meta';
import { ResultFrameworkReportingHomeService } from '../../services/result-framework-reporting-home.service';

interface StatusSegment {
  statusId: number;
  label: string;
  fullLabel: string;
  count: number;
  pct: number;
  barClass: string;
  chipClass: string;
  dotClass: string;
}

@Component({
  selector: 'app-result-framework-reporting-card-item',
  imports: [RouterLink],
  templateUrl: './result-framework-reporting-card-item.component.html',
  styleUrl: './result-framework-reporting-card-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingCardItemComponent {
  readonly homeService = inject(ResultFrameworkReportingHomeService);

  @Input() item: SPProgress;
  imageLoadError = signal(false);

  get displayName(): string {
    if (this.item?.initiativeId === 41 || this.item?.initiativeCode === 'SGP-02') {
      return this.item?.initiativeShortName ?? this.item?.initiativeName;
    }
    return this.item?.initiativeName;
  }

  get totalResults(): number {
    return this.item?.totalResults ?? 0;
  }

  statusSegments(): StatusSegment[] {
    const counts = new Map<number, { name: string; count: number }>();

    for (const version of this.item?.versions ?? []) {
      for (const status of version?.statuses ?? []) {
        const prev = counts.get(status.statusId);
        counts.set(status.statusId, { name: status.statusName, count: (prev?.count ?? 0) + status.count });
      }
    }

    const total = [...counts.values()].reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return [];

    return [...counts.entries()]
      .map(([statusId, { name, count }]) => {
        const meta = STATUS_META[statusId];
        return {
          statusId,
          label: meta?.label ?? name,
          fullLabel: name,
          count,
          pct: (count / total) * 100,
          barClass: meta?.barClass ?? 'bg-[var(--pr-color-accents-3)]',
          chipClass: meta?.chipClass ?? 'bg-[var(--pr-color-accents-1)] text-[var(--pr-color-accents-6)]',
          dotClass: meta?.dotClass ?? 'bg-[var(--pr-color-accents-3)]',
          order: meta?.order ?? 99
        };
      })
      .sort((a, b) => a.order - b.order)
      .map(({ order, ...segment }) => segment);
  }
}
