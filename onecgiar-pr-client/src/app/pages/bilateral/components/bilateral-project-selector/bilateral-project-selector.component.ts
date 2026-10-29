import { Component, inject, input, output, effect, signal, computed, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { HlmButtonImports } from '@spartan/button';
import { HlmBadgeImports } from '@spartan/badge';

/** PSC-DD-2 — program identity is the code (trimmed, case-insensitive), never the id (P2-3807). */
const normalizeCode = (code: string | null | undefined): string => String(code ?? '').trim().toUpperCase();

export interface ProgramChip {
  code: string;
  shortName: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-bilateral-project-selector',
  imports: [CommonModule, ...HlmButtonImports, ...HlmBadgeImports],
  templateUrl: './bilateral-project-selector.component.html',
  styleUrl: './bilateral-project-selector.component.scss'
})
export class BilateralProjectSelectorComponent {
  readonly creationService = inject(BilateralCreationService);
  readonly ctx = inject(BilateralContextService);

  /**
   * P2-3518 — `inline` embeds this picker in the Section 0 card of an EXISTING result. It drops the
   * label and the summary/description block (that card renders both itself, so keeping them would
   * duplicate them), and it re-points the lead project through
   * `BilateralCreationService.setLeadProject()` instead of `selectProject()`, which would clear the
   * Science Program choice. `wizard` (the default) is the create flow, unchanged.
   */
  variant = input<'wizard' | 'inline'>('wizard');
  /** Section 0 stages a project until its primary program has also been selected. */
  deferCommit = input<boolean>(false);
  previewProject = input<BilateralProject | null>(null);
  readonly isInline = computed(() => this.variant() === 'inline');
  readonly displayProject = computed(
    () => this.previewProject() ?? this.creationService.selectedProject(),
  );

  projectSelected = output<BilateralProject>();
  showDropdown = signal(false);
  searchText = signal('');

  /** PSC-R-1 — one chip per Science Program present in the catalogue, deduped by code, sorted by code. */
  readonly programChips = computed<ProgramChip[]>(() => {
    const byCode = new Map<string, ProgramChip>();
    for (const project of this.creationService.projects()) {
      const seen = new Set<string>();
      for (const sp of project.sciencePrograms ?? []) {
        const code = normalizeCode(sp.programCode);
        if (!code) continue;
        const chip = byCode.get(code) ?? { code, shortName: sp.spShortName, name: sp.spName, count: 0 };
        if (!seen.has(code)) {
          chip.count++;
          seen.add(code);
        }
        byCode.set(code, chip);
      }
    }
    return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  });

  readonly showProgramChips = computed(() => this.isInline() && this.creationService.isReplicated() && this.programChips().length > 0);

  /** PSC-R-2 — stored primary code, only when the catalogue has a chip for it. */
  readonly defaultProgramCode = computed<string | null>(() => {
    const code = normalizeCode(this.creationService.selectedPrimarySp()?.programCode);
    return code && this.programChips().some(c => c.code === code) ? code : null;
  });

  /** PSC-DD-3 — re-seeds only when the default code changes; user toggles persist otherwise. */
  readonly selectedProgramCodes = linkedSignal<string | null, Set<string>>({
    source: this.defaultProgramCode,
    computation: code => new Set(code ? [code] : [])
  });

  filteredProjects = computed(() => {
    const text = this.searchText().toLowerCase();
    const selected = this.selectedProgramCodes();
    const byProgram = this.showProgramChips() && selected.size > 0;
    return this.creationService.projects().filter(p => {
      const matchesText = !text || p.shortName.toLowerCase().includes(text) || p.fullName.toLowerCase().includes(text);
      return matchesText && (!byProgram || (p.sciencePrograms ?? []).some(sp => selected.has(normalizeCode(sp.programCode))));
    });
  });

  constructor() {
    effect(() => {
      // ⚠️ The endpoint keys off the numeric CLARISA institution id, NOT the centre code.
      // `ctx.centerId()` holds the code ("CIP"), and `GET /api/bilateral/center/projects`
      // answers `{ projects: [] }` for it — a 200 with nothing in it, so the dropdown rendered
      // empty for every centre and no bilateral result could be created at all. Verified on
      // prtest: centerId=CIP → [], centerId=49 → 1 project. `bilateral-ai.service.ts:60,150`
      // already reads the institution id for the same reason. (A CLARISA centre CODE such as
      // "CENTER-02" is a different thing from the acronym "CIP": the server resolves a numeric
      // institution id first and then a CLARISA code, so the lead-Center code below also works.)
      //
      // PAA-DD-6 — `inline` (existing result): the server validates a re-pointed project against the
      // catalogue of the result's LEAD Center, which can differ from the page centre, so request it by
      // that code once `resultLeadCenterCode()` is known. Until it arrives (loadResult still in
      // flight) we fall back to the page institution id; the effect re-runs when the code lands and
      // the final `projects()` is the lead-Center list. `wizard` (create) is unchanged.
      const leadCenterCode = this.isInline() ? this.creationService.resultLeadCenterCode() : null;
      const institutionId = this.ctx.centerInstitutionId();
      const key = leadCenterCode || institutionId;
      if (key) {
        this.creationService.getProjects(key);
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

  toggleProgram(code: string): void {
    this.selectedProgramCodes.update(current => {
      const next = new Set(current);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  }

  clearPrograms(): void {
    this.selectedProgramCodes.set(new Set());
  }

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  selectProject(project: BilateralProject): void {
    if (this.isInline() && !this.deferCommit()) {
      this.creationService.setLeadProject(project);
    } else if (!this.isInline()) {
      this.creationService.selectProject(project);
    }
    this.showDropdown.set(false);
    this.projectSelected.emit(project);
  }

  get selectedLabel(): string {
    const p = this.displayProject();
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
