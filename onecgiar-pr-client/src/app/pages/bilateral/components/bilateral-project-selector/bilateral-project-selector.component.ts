import { Component, inject, output, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';

@Component({
  selector: 'app-bilateral-project-selector',
  imports: [CommonModule],
  templateUrl: './bilateral-project-selector.component.html',
  styleUrl: './bilateral-project-selector.component.scss'
})
export class BilateralProjectSelectorComponent {
  readonly creationService = inject(BilateralCreationService);
  readonly ctx = inject(BilateralContextService);

  projectSelected = output<BilateralProject>();
  showDropdown = signal(false);
  searchText = signal('');

  filteredProjects = computed(() => {
    const text = this.searchText().toLowerCase();
    if (!text) return this.creationService.projects();
    return this.creationService.projects().filter(
      p => p.shortName.toLowerCase().includes(text) || p.fullName.toLowerCase().includes(text)
    );
  });

  constructor() {
    effect(() => {
      // ⚠️ The endpoint keys off the numeric CLARISA institution id, NOT the centre code.
      // `ctx.centerId()` holds the code ("CIP"), and `GET /api/bilateral/center/projects`
      // answers `{ projects: [] }` for it — a 200 with nothing in it, so the dropdown rendered
      // empty for every centre and no bilateral result could be created at all. Verified on
      // prtest: centerId=CIP → [], centerId=49 → 1 project. `bilateral-ai.service.ts:60,150`
      // already reads the institution id for the same reason.
      const institutionId = this.ctx.centerInstitutionId();
      if (institutionId) {
        this.creationService.getProjects(institutionId);
      }
    });
  }

  toggleDropdown(): void {
    this.showDropdown.update(v => !v);
    if (this.showDropdown()) this.searchText.set('');
  }

  closeDropdown(): void {
    this.showDropdown.set(false);
  }

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  selectProject(project: BilateralProject): void {
    this.creationService.selectProject(project);
    this.showDropdown.set(false);
    this.projectSelected.emit(project);
  }

  get selectedLabel(): string {
    const p = this.creationService.selectedProject();
    return p ? `${p.shortName} — ${p.fullName}` : 'Select a project';
  }

  displayText(value: string | null | undefined): string {
    const normalized = value?.replace(/[\s\u00A0]+/g, ' ').trim() ?? '';
    if (!normalized || normalized.toUpperCase() === '[NULL]') {
      return 'Not provided in W3 Registry';
    }
    return normalized;
  }
}
