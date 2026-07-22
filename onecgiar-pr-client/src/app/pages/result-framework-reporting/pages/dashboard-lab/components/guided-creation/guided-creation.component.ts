import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ResultFrameworkReportingHomeService } from '../../../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress } from '../../../../../../shared/interfaces/SP-progress.interface';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { Unit } from '../../../entity-details/interfaces/entity-details.interface';
import { FormsModule } from '@angular/forms';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

/** A reporting path. `planned` contributes to a ToC indicator; `emerging` does not. */
type ReportingPath = 'planned' | 'emerging';

/**
 * A linear step. Both paths now walk the same road: type → program → area of work
 * → indicator → title → review. The old confirmation-panel screens are gone; a
 * change only asks for confirmation when it would invalidate a later step.
 */
type Step = 'path' | 'program' | 'aow' | 'indicator' | 'title' | 'review';

/** A change to a completed step that would clear later selections, held for confirmation. */
interface PendingChange {
  message: string;
  detail: string;
  apply: () => void;
  clearAll: () => void;
}

/**
 * GUIDED CREATION — full-screen, step by step.
 *
 * Every step is visible in the top rail as a chip; tapping a chip jumps back to
 * that step. Changing an earlier answer only wipes what depends on it (a new
 * program clears its Area of Work + indicator; a new area of work clears its
 * indicator) — the title is always kept unless the user asks to clear everything.
 */
@Component({
  selector: 'app-guided-creation',
  standalone: true,
  imports: [FormsModule, CustomFieldsModule],
  templateUrl: './guided-creation.component.html',
  styleUrls: ['./guided-creation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuidedCreationComponent implements OnDestroy {
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly api = inject(ApiService);
  private readonly dataControlSE = inject(DataControlService);
  private readonly router = inject(Router);

  /** Entering from a category card pre-answers the first question. */
  readonly prefillPath = input<ReportingPath | null>(null);

  /** Emitted when the user leaves the flow (ESC, close, or after hand-off). */
  readonly closed = output<void>();

  readonly step = signal<Step>('path');
  readonly path = signal<ReportingPath | null>(null);
  readonly program = signal<SPProgress | null>(null);
  readonly aow = signal<Unit | null>(null);
  readonly indicator = signal<any | null>(null);
  /** The HLO node the chosen indicator hangs from — carries the toc_result_id the create call needs. */
  readonly tocResultId = signal<number | null>(null);
  readonly title = signal('');

  /** True while the create call is in flight (locks the finish button). */
  readonly creating = signal(false);

  /** A change awaiting confirmation because it clears later steps. */
  readonly pendingChange = signal<PendingChange | null>(null);

  /** Ordered steps. `path` drops out once it is pre-filled from the hub. */
  readonly steps = computed<Step[]>(() => {
    const base: Step[] = ['program', 'aow', 'indicator', 'title', 'review'];
    return this.prefillPath() ? base : ['path', ...base];
  });

  readonly stepIndex = computed(() => Math.max(0, this.steps().indexOf(this.step())));

  // ---- data -------------------------------------------------------------

  private readonly aowsByCode = signal<Map<string, Unit[]>>(new Map());
  private readonly loadingCodes = signal<Set<string>>(new Set());
  private readonly tocByKey = signal<Map<string, any[]>>(new Map());
  /** Free-text filter for the "where to report" column. */
  readonly indicatorSearch = signal('');
  /** HLO groups collapsed in the indicator step. */
  readonly collapsedHlo = signal<Set<string>>(new Set());
  readonly typologyFilter = signal<string | null>(null);
  readonly statusFilter = signal<string | null>(null);
  private readonly loadingTocKeys = signal<Set<string>>(new Set());

  readonly aows = computed(() => {
    const code = this.program()?.initiativeCode;
    return code ? this.aowsByCode().get(code) ?? [] : [];
  });
  readonly loadingAows = computed(() => {
    const code = this.program()?.initiativeCode;
    return !!code && this.loadingCodes().has(code) && !this.aowsByCode().has(code);
  });

  /** HLO groups for the indicator step, filtered by the search box. */
  readonly indicatorGroups = computed(() => {
    const key = this.tocKey();
    const groups = key ? this.tocByKey().get(key) ?? [] : [];
    const q = this.indicatorSearch().trim().toLowerCase();
    const typ = this.typologyFilter();
    const st = this.statusFilter();
    if (!q && !typ && !st) return groups;
    return groups
      .map(g => ({
        ...g,
        indicators: (g?.indicators ?? []).filter(
          (i: any) =>
            (!q || `${i?.indicator_description ?? ''} ${i?.type_name ?? ''}`.toLowerCase().includes(q)) &&
            (!typ || i?.type_name === typ) &&
            (!st || this.statusLabel(i?.progress_percentage) === st)
        )
      }))
      .filter(g => (g.indicators ?? []).length > 0);
  });

  /** Status derived from progress_percentage (mirrors the AoW indicator table). */
  statusLabel(pct: string | number | null | undefined): string {
    const p = typeof pct === 'number' ? pct : parseFloat(String(pct ?? 0)) || 0;
    if (p <= 0) return 'Not started';
    if (p <= 99) return 'In progress';
    if (p === 100) return 'Achieved';
    return 'Overachieved';
  }

  /** Options shaped for <app-pr-select>, built from the indicators actually loaded. */
  readonly typologySelectOptions = computed(() => {
    const key = this.tocKey();
    const groups = key ? this.tocByKey().get(key) ?? [] : [];
    const set = new Set<string>();
    groups.forEach((g: any) => (g?.indicators ?? []).forEach((i: any) => i?.type_name && set.add(i.type_name)));
    return [{ label: 'All typologies', value: '' }, ...[...set].map(t => ({ label: t, value: t }))];
  });

  readonly statusSelectOptions = [
    { label: 'All statuses', value: '' },
    ...['Not started', 'In progress', 'Achieved', 'Overachieved'].map(s => ({ label: s, value: s }))
  ];

  readonly hasFilters = computed(() => !!(this.typologyFilter() || this.statusFilter() || this.indicatorSearch().trim()));

  clearFilters(): void {
    this.typologyFilter.set(null);
    this.statusFilter.set(null);
    this.indicatorSearch.set('');
  }

  readonly indicatorCount = computed(() => this.indicatorGroups().reduce((n, g) => n + (g?.indicators?.length ?? 0), 0));

  isHloCollapsed(title: string): boolean {
    return this.collapsedHlo().has(title);
  }

  toggleHlo(title: string): void {
    this.collapsedHlo.update(set => {
      const next = new Set(set);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  /** Split "HLO4.AOW1.IO1 Foster motivations" into code + name. */
  splitHlo(title: string | null | undefined): { code: string | null; name: string } {
    const text = String(title ?? '').trim();
    const hlo = /^(HLO[^\s]*(?:\s*\d[\d.]*)?)\s*[-–:]?\s+(.+)$/i.exec(text);
    if (hlo) return { code: hlo[1].trim(), name: hlo[2].trim() };
    const numeric = /^([\d.]+)\s*[:–-]\s*(.+)$/.exec(text);
    return numeric ? { code: numeric[1], name: numeric[2] } : { code: null, name: text };
  }
  readonly loadingIndicators = computed(() => {
    const key = this.tocKey();
    return !!key && this.loadingTocKeys().has(key) && !this.tocByKey().has(key);
  });

  private tocKey(): string | null {
    const sp = this.program()?.initiativeCode;
    const aow = this.aow()?.code;
    return sp && aow ? `${sp}::${aow}` : null;
  }

  /** "My programs" is the answer almost every time; the rest start collapsed. */
  readonly collapsedGroups = signal<Set<string>>(new Set(['Other programs', 'Other projects']));

  readonly programGroups = computed(() =>
    [
      { label: 'My programs', items: this.homeSE.mySPsList() },
      { label: 'Other programs', items: this.homeSE.otherSPsList() },
      { label: 'Other projects', items: this.homeSE.otherProjectsList() }
    ].filter(group => group.items.length)
  );

  // ---- top rail chips (one per step, with the picked value) ---------------

  readonly chips = computed(() => {
    const out: { step: Step; label: string; value: string | null; icon: string }[] = [];
    if (!this.prefillPath()) {
      out.push({ step: 'path', label: 'Type', value: this.path() ? (this.path() === 'planned' ? 'Planned' : 'Emerging') : null, icon: this.path() === 'emerging' ? 'bolt' : 'flag' });
    }
    out.push({ step: 'program', label: 'Program', value: this.program()?.initiativeCode ?? null, icon: 'hub' });
    out.push({ step: 'aow', label: 'Area of Work', value: this.aow()?.code ?? null, icon: 'category' });
    out.push({ step: 'indicator', label: 'Indicator', value: this.indicator()?.indicator_description ?? null, icon: 'insights' });
    out.push({ step: 'title', label: 'Title', value: this.title().trim() || null, icon: 'title' });
    return out;
  });

  /** Review rows — the same data, laid out with an edit affordance. */
  readonly summary = computed(() => this.chips().filter(c => c.value));

  constructor() {
    this.dataControlSE.focusMode.set(true);
    if (!this.homeSE.mySPsList().length && !this.homeSE.otherSPsList().length) {
      this.homeSE.getScienceProgramsProgress();
    }
    const prefill = this.prefillPath();
    if (prefill) {
      this.path.set(prefill);
      this.step.set('program');
    }
  }

  ngOnDestroy(): void {
    this.dataControlSE.focusMode.set(false);
  }

  // ---- step navigation ----------------------------------------------------

  /** Jump straight to a step from a chip or a review pencil. */
  goToStep(step: Step): void {
    this.pendingChange.set(null);
    this.step.set(step);
  }

  /** A step is reachable once every step before it has an answer. */
  isStepReady(step: Step): boolean {
    switch (step) {
      case 'path':
      case 'program':
        return true;
      case 'aow':
        return !!this.program();
      case 'indicator':
        return !!this.aow();
      case 'title':
        return !!this.indicator();
      case 'review':
        return !!this.title().trim();
    }
  }

  back(): void {
    if (this.pendingChange()) {
      this.pendingChange.set(null);
      return;
    }
    const order = this.steps();
    const i = order.indexOf(this.step());
    if (i <= 0) {
      this.close();
      return;
    }
    this.step.set(order[i - 1]);
  }

  // ---- selection (advances the flow; asks only when it clears later steps) --

  selectPath(value: ReportingPath): void {
    this.path.set(value);
    this.step.set('program');
  }

  selectProgram(sp: SPProgress): void {
    const prev = this.program();
    if (prev && prev.initiativeId !== sp.initiativeId && (this.aow() || this.indicator())) {
      this.pendingChange.set({
        message: 'Change the Science Program?',
        detail: 'An Area of Work belongs to one program, so its Area of Work and Indicator will be cleared. Your title is kept.',
        apply: () => {
          this.program.set(sp);
          this.aow.set(null);
          this.indicator.set(null);
          this.tocResultId.set(null);
          this.loadAows(sp.initiativeCode);
          this.step.set('aow');
        },
        clearAll: () => {
          this.program.set(sp);
          this.aow.set(null);
          this.indicator.set(null);
          this.tocResultId.set(null);
          this.title.set('');
          this.loadAows(sp.initiativeCode);
          this.step.set('aow');
        }
      });
      return;
    }
    this.program.set(sp);
    this.loadAows(sp.initiativeCode);
    this.step.set('aow');
  }

  selectAow(unit: Unit): void {
    const prev = this.aow();
    if (prev && prev.code !== unit.code && this.indicator()) {
      this.pendingChange.set({
        message: 'Change the Area of Work?',
        detail: 'The Indicator you picked belongs to the current Area of Work, so it will be cleared. Your title is kept.',
        apply: () => {
          this.aow.set(unit);
          this.indicator.set(null);
          this.tocResultId.set(null);
          this.clearFilters();
          const sp = this.program();
          if (sp) this.loadToc(sp.initiativeCode, unit.code);
          this.step.set('indicator');
        },
        clearAll: () => {
          this.aow.set(unit);
          this.indicator.set(null);
          this.tocResultId.set(null);
          this.title.set('');
          this.clearFilters();
          const sp = this.program();
          if (sp) this.loadToc(sp.initiativeCode, unit.code);
          this.step.set('indicator');
        }
      });
      return;
    }
    this.aow.set(unit);
    this.clearFilters();
    const sp = this.program();
    if (sp) this.loadToc(sp.initiativeCode, unit.code);
    this.step.set('indicator');
  }

  selectIndicator(ind: any, tocResultId: number | null): void {
    this.indicator.set(ind);
    this.tocResultId.set(tocResultId ?? ind?.toc_result_id ?? null);
    this.step.set('title');
  }

  confirmTitle(): void {
    if (this.title().trim()) this.step.set('review');
  }

  applyChange(): void {
    const c = this.pendingChange();
    if (c) {
      c.apply();
      this.pendingChange.set(null);
    }
  }

  clearAllChange(): void {
    const c = this.pendingChange();
    if (c) {
      c.clearAll();
      this.pendingChange.set(null);
    }
  }

  cancelChange(): void {
    this.pendingChange.set(null);
  }

  isGroupCollapsed(label: string): boolean {
    return this.collapsedGroups().has(label);
  }

  toggleGroup(label: string): void {
    this.collapsedGroups.update(set => {
      const next = new Set(set);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  close(): void {
    this.closed.emit();
  }

  /**
   * Create the result from everything the wizard collected — same POST the create
   * modal fires — then redirect to its Result Detail so the rest is filled there.
   * The wizard only gathers program + AoW + indicator + title; every other field
   * (centers, science programs, evidence…) is completed on the Result Detail.
   */
  finish(): void {
    const sp = this.program();
    const ind = this.indicator();
    if (!sp || !ind || this.creating()) return;
    this.creating.set(true);

    const body = {
      result: {
        result_type_id: ind?.result_type_id,
        result_level_id: ind?.result_level_id,
        initiative_id: sp.initiativeId,
        result_name: this.title().trim(),
        handler: ''
      },
      number_target: ind?.number_target,
      target_date: ind?.target_date,
      contributing_indicator: null,
      contributing_center: [],
      knowledge_product: null,
      toc_result_id: this.tocResultId(),
      toc_progressive_narrative: '',
      indicators: ind || [],
      contributors_result_toc_result: [],
      bilateral_project: []
    };

    this.api.resultsSE.POST_createResult(body).subscribe({
      next: (resp: any) => {
        this.api.alertsFe.show({ id: 'guidedCreateSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        this.creating.set(false);
        this.closed.emit();
        this.router.navigate([`/result/result-detail/${resp?.response?.result?.result_code}/general-information`], {
          queryParams: { phase: resp?.response?.result?.version_id }
        });
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'guidedCreateError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.creating.set(false);
      }
    });
  }

  // ---- fetching ----------------------------------------------------------

  private loadAows(code: string): void {
    if (this.aowsByCode().has(code) || this.loadingCodes().has(code)) return;
    this.loadingCodes.update(set => new Set(set).add(code));
    this.api.resultsSE.GET_ClarisaGlobalUnits(code).subscribe({
      next: ({ response }) => this.cacheAows(code, response?.units ?? []),
      error: () => this.cacheAows(code, [])
    });
  }

  private cacheAows(code: string, units: Unit[]): void {
    this.aowsByCode.update(map => new Map(map).set(code, units));
    this.loadingCodes.update(set => {
      const next = new Set(set);
      next.delete(code);
      return next;
    });
  }

  private loadToc(program: string, aow: string): void {
    const key = `${program}::${aow}`;
    if (this.tocByKey().has(key) || this.loadingTocKeys().has(key)) return;
    this.loadingTocKeys.update(s => new Set(s).add(key));
    this.api.resultsSE.GET_TocResultsByAowId(program, aow).subscribe({
      next: (res: { response?: { tocResultsOutputs?: any[]; tocResultsOutcomes?: any[] } }) =>
        this.cacheToc(key, [...(res?.response?.tocResultsOutputs ?? []), ...(res?.response?.tocResultsOutcomes ?? [])]),
      error: () => this.cacheToc(key, [])
    });
  }

  private cacheToc(key: string, list: any[]): void {
    this.tocByKey.update(m => new Map(m).set(key, list));
    this.loadingTocKeys.update(s => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  /** How the "where to report" list is rendered. */
  readonly listView = signal<'list' | 'table'>('list');

  setView(view: 'list' | 'table'): void {
    this.listView.set(view);
  }

  /** A stable icon + colour per Area of Work, so the list is scannable. */
  private readonly AOW_ICONS = ['insights', 'science', 'diversity_3', 'agriculture', 'public', 'hub', 'eco', 'bolt'];

  aowIcon(unit: Unit, index: number): string {
    return this.AOW_ICONS[index % this.AOW_ICONS.length];
  }

  aowAccent(index: number): string {
    const palette = ['#6b6dc4', '#2f8f6b', '#bf4b26', '#3b82f6', '#a6558f', '#c08a1e'];
    return palette[index % palette.length];
  }

  /** Each program keeps its own ring colour so the list is readable at a glance. */
  accentFor(sp: SPProgress): string {
    const palette = ['#6b6dc4', '#bf4b26', '#1e202f', '#2f8f6b', '#a6558f', '#c08a1e', '#3b82f6', '#d0435a'];
    return palette[(sp.initiativeId ?? 0) % palette.length];
  }

  iconSrc(sp: SPProgress): string {
    return `/assets/result-framework-reporting/SPs-Icons/${sp.initiativeCode}.png`;
  }
}
