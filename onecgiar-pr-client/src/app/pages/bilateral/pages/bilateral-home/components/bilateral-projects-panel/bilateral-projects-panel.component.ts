import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../../../services/bilateral-context.service';
import { BilateralCreationService } from '../../../../services/bilateral-creation.service';
import { BilateralProject } from '../../../../services/bilateral-creation.interfaces';

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

  selectAndCreate(project: BilateralProject): void {
    this.creationService.selectProject(project);
  }

  readonly projects = signal<BilateralProject[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly searchQuery = signal('');

  readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim();
    if (!query) return this.projects();

    const tokens = normalize(query).split(/\s+/).filter(Boolean);

    return this.projects().filter(p => {
      const haystack = [
        p.shortName,
        p.fullName ?? '',
        ...p.sciencePrograms.map(sp => sp.spName),
        ...p.sciencePrograms.map(sp => sp.spShortName),
        ...p.sciencePrograms.map(sp => sp.programCode),
      ].map(normalize).join(' ');

      return tokens.every(token => haystack.includes(token));
    });
  });

  constructor() {
    effect(() => {
      const centerId = this.ctx.centerId();
      if (!centerId) return;
      untracked(() => {
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

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
