import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../../../services/bilateral-context.service';
import { BilateralCreationService } from '../../../../services/bilateral-creation.service';
import { BilateralProject } from '../../../../services/bilateral-creation.interfaces';

export interface KpiProgramStat {
  programId: number;
  programCode: string;
  spName: string;
  spShortName: string;
  count: number;
}

export interface KpiSummary {
  total: number;
  byProgram: KpiProgramStat[];
  multiProgramCount: number;
}

function getInitialViewMode(): 'grid' | 'list' {
  try {
    const saved = sessionStorage.getItem('pr.bilateral.viewMode');
    if (saved === 'grid' || saved === 'list') {
      return saved;
    }
  } catch {
    // Fallback if sessionStorage is not accessible
  }
  return 'grid';
}

@Component({
  selector: 'app-bilateral-projects-panel',
  standalone: true,
  imports: [RouterModule, DecimalPipe],
  templateUrl: './bilateral-projects-panel.component.html',
  styleUrl: './bilateral-projects-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralProjectsPanelComponent {
  private readonly bilateralApiService = inject(BilateralApiService);
  readonly ctx = inject(BilateralContextService);
  readonly creationService = inject(BilateralCreationService);

  readonly projects = signal<BilateralProject[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly searchQuery = signal('');
  readonly selectedProgramFilter = signal<string>('ALL');
  readonly selectedMultiProgramOnly = signal<boolean>(false);
  readonly viewMode = signal<'grid' | 'list'>(getInitialViewMode());

  readonly kpiSummary = computed<KpiSummary>(() => {
    const list = this.projects();
    const total = list.length;
    let multiProgramCount = 0;
    const statsMap = new Map<string, KpiProgramStat>();

    for (const project of list) {
      const sps = project.sciencePrograms ?? [];
      if (sps.length > 1) {
        multiProgramCount++;
      }

      const seenProgramsInProject = new Set<string>();
      for (const sp of sps) {
        const key = sp.programCode || sp.spName || String(sp.programId);
        if (!key || seenProgramsInProject.has(key)) continue;
        seenProgramsInProject.add(key);

        const existing = statsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          statsMap.set(key, {
            programId: sp.programId,
            programCode: sp.programCode,
            spName: sp.spName,
            spShortName: sp.spShortName,
            count: 1
          });
        }
      }
    }

    const byProgram = Array.from(statsMap.values()).sort((a, b) => b.count - a.count);

    return {
      total,
      byProgram,
      multiProgramCount
    };
  });

  readonly filteredProjects = computed(() => {
    let list = this.projects();

    if (this.selectedMultiProgramOnly()) {
      list = list.filter(p => (p.sciencePrograms ?? []).length > 1);
    }

    const programFilter = this.selectedProgramFilter().trim().toLowerCase();
    if (programFilter && programFilter !== 'all') {
      list = list.filter(p =>
        (p.sciencePrograms ?? []).some(sp =>
          sp.spName?.toLowerCase() === programFilter ||
          sp.spShortName?.toLowerCase() === programFilter ||
          sp.programCode?.toLowerCase() === programFilter
        )
      );
    }

    const query = this.searchQuery().trim();
    if (query) {
      const tokens = normalize(query).split(/\s+/).filter(Boolean);

      list = list.filter(p => {
        const haystack = [
          p.shortName ?? '',
          p.fullName ?? '',
          p.summary ?? '',
          p.description ?? '',
          ...(p.sciencePrograms ?? []).map(sp => sp.spName ?? ''),
          ...(p.sciencePrograms ?? []).map(sp => sp.spShortName ?? ''),
          ...(p.sciencePrograms ?? []).map(sp => sp.programCode ?? ''),
        ].map(normalize).join(' ');

        return tokens.every(token => haystack.includes(token));
      });
    }

    return list;
  });

  constructor() {
    effect(() => {
      const centerId = this.ctx.centerId() || this.ctx.centerAcronym();
      if (!centerId) return;
      untracked(() => {
        this.searchQuery.set('');
        this.selectedProgramFilter.set('ALL');
        this.selectedMultiProgramOnly.set(false);
        this.loading.set(true);
        this.error.set(false);
        this.bilateralApiService.GET_bilateralProjects(centerId).subscribe({
          next: ({ response }) => {
            this.projects.set(response?.projects ?? response ?? []);
            this.loading.set(false);
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          }
        });
      });
    });
  }

  setProgramFilter(program: string): void {
    this.selectedProgramFilter.set(program);
    this.selectedMultiProgramOnly.set(false);
  }

  setMultiProgramOnly(active: boolean): void {
    this.selectedMultiProgramOnly.set(active);
    if (active) {
      this.selectedProgramFilter.set('ALL');
    }
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    try {
      sessionStorage.setItem('pr.bilateral.viewMode', mode);
    } catch {
      // Fallback if sessionStorage is not accessible
    }
  }

  resetAllFilters(): void {
    this.searchQuery.set('');
    this.selectedProgramFilter.set('ALL');
    this.selectedMultiProgramOnly.set(false);
  }

  selectAndCreate(project: BilateralProject): void {
    this.creationService.selectProject(project);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}

function normalize(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
