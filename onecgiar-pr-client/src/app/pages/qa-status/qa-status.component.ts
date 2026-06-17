import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { QaStatusService } from './qa-status.service';
import { QaStatusItem, QaStatusItemMetrics, QaStatusValue } from './qa-status.interfaces';

interface StatusMetaEntry {
  label: string;
  cssClass: string;
}

const STATUS_META: Record<QaStatusValue, StatusMetaEntry> = {
  pendiente: { label: 'Pending', cssClass: 'qa-status-chip qa-chip--pendiente' },
  'en-progreso': { label: 'In progress', cssClass: 'qa-status-chip qa-chip--en-progreso' },
  'listo-para-pruebas': { label: 'Ready for testing', cssClass: 'qa-status-chip qa-chip--listo-para-pruebas' },
  done: { label: 'Done', cssClass: 'qa-status-chip qa-chip--done' }
};

const FALLBACK_META: StatusMetaEntry = { label: 'Unknown', cssClass: 'qa-status-chip qa-chip--pendiente' };

@Component({
  selector: 'app-qa-status',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, TooltipModule],
  templateUrl: './qa-status.component.html',
  styleUrls: ['./qa-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QaStatusComponent implements OnInit {
  private readonly qaStatusSE = inject(QaStatusService);

  readonly board = this.qaStatusSE.board;
  readonly loadError = this.qaStatusSE.loadError;

  readonly expanded = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.qaStatusSE.load();
  }

  toggle(id: string): void {
    this.expanded.update(state => ({ ...state, [id]: !state[id] }));
  }

  isExpanded(id: string): boolean {
    return !!this.expanded()[id];
  }

  statusLabel(status: QaStatusValue): string {
    return (STATUS_META[status] ?? FALLBACK_META).label;
  }

  chipClass(status: QaStatusValue): string {
    return (STATUS_META[status] ?? FALLBACK_META).cssClass;
  }

  /** Item metrics may be a plain string; return it when that's the case. */
  metricsText(metrics: QaStatusItemMetrics | undefined): string | null {
    return typeof metrics === 'string' ? metrics : null;
  }

  /** Item metrics may be a keyed object; return its [key, value] entries. */
  metricsEntries(metrics: QaStatusItemMetrics | undefined): Array<{ key: string; value: unknown }> {
    if (!metrics || typeof metrics === 'string') return [];
    return Object.keys(metrics).map(key => ({ key, value: (metrics as Record<string, unknown>)[key] }));
  }

  hasMetrics(metrics: QaStatusItemMetrics | undefined): boolean {
    if (!metrics) return false;
    if (typeof metrics === 'string') return metrics.trim().length > 0;
    return Object.keys(metrics).length > 0;
  }

  /**
   * Resolve a screenshot reference to a servable URL. Bare filenames resolve
   * under `./assets/qa-status/`; absolute/relative URLs are passed through.
   */
  screenshotSrc(ref: string): string {
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith('./') || ref.startsWith('assets/')) {
      return ref;
    }
    const fileName = ref.split('/').pop() ?? ref;
    return `./assets/qa-status/${fileName}`;
  }

  trackById = (_: number, item: QaStatusItem): string => item.id;
}
