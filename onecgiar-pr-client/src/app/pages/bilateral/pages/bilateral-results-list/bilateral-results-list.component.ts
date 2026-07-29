import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';

export interface BilateralCenterResult {
  id: number;
  result_code: string;
  title: string;
  result_type: string;
  status_id: number;
  status_name: string;
  created_date: string;
  version_id: number;
}

@Component({
  selector: 'app-bilateral-results-list',
  standalone: true,
  imports: [DatePipe, BilateralPageHeaderComponent],
  templateUrl: './bilateral-results-list.component.html',
  styleUrl: './bilateral-results-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralResultsListComponent implements OnInit {
  private readonly bilateralApiService = inject(BilateralApiService);
  private readonly phasesService = inject(PhasesService);
  private readonly router = inject(Router);
  readonly ctx = inject(BilateralContextService);

  readonly phases = signal<Phases[]>([]);
  readonly selectedPhase = signal<Phases | null>(null);
  readonly results = signal<BilateralCenterResult[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly searchQuery = signal('');

  readonly filteredResults = computed(() => {
    const query = normalise(this.searchQuery());
    if (!query) return this.results();
    const tokens = query.split(/\s+/).filter(Boolean);
    return this.results().filter(r => {
      const hay = normalise(`${r.result_code} ${r.title} ${r.result_type}`);
      return tokens.every(t => hay.includes(t));
    });
  });

  ngOnInit(): void {
    const reportingPhases = this.phasesService.phases.reporting;
    this.phases.set(reportingPhases);

    const active =
      this.phasesService.currentlyActivePhaseOnReporting ?? reportingPhases[0] ?? null;
    this.selectedPhase.set(active);

    if (active) {
      this.loadResults(active.id);
    }
  }

  selectPhase(phase: Phases): void {
    this.selectedPhase.set(phase);
    this.searchQuery.set('');
    this.loadResults(phase.id);
  }

  loadResults(versionId: number): void {
    const centerId = this.ctx.centerId();
    if (!centerId) return;

    this.loading.set(true);
    this.error.set(false);

    this.bilateralApiService.GET_bilateralCenterResults(centerId, versionId).subscribe({
      next: ({ response }) => {
        this.results.set(response ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  openResult(result: BilateralCenterResult): void {
    this.router.navigate(
      ['/result/result-detail', result.result_code, 'general-information'],
      { queryParams: { phase: result.version_id } }
    );
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  statusClass(statusId: number): string {
    const map: Record<number, string> = {
      1: 'draft',
      2: 'active',
      3: 'active',
      5: 'pending',
      6: 'approved',
      7: 'rejected',
    };
    return map[statusId] ?? 'draft';
  }
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
