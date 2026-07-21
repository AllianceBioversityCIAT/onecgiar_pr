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
 * Screens, not numbered steps: the two paths genuinely diverge. `browse` is the
 * three-column explorer the planned path needs (program → area of work →
 * indicator); the emerging path only needs to know the program.
 */
type Screen = 'choice' | 'browse' | 'program' | 'review';

/** What the side panel is currently asking the user to confirm. */
interface PendingChoice {
  kind: 'path' | 'program' | 'indicator';
  title: string;
  subtitle: string;
  body: string;
  accent: string;
  icon: string;
  payload: any;
}

/**
 * GUIDED CREATION — full-screen, one decision at a time.
 *
 * Implements openspec change `guided-result-reporting-flow` §0 (A2). Choices are
 * never applied on click: selecting opens a confirmation panel that takes 35% of
 * the surface and explains what the choice means, so nothing is decided by accident
 * (design D10/D11). Every answer stays revisable from the review screen.
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

  readonly screen = signal<Screen>('choice');
  readonly path = signal<ReportingPath | null>(null);
  readonly program = signal<SPProgress | null>(null);
  readonly aow = signal<Unit | null>(null);
  readonly indicator = signal<any | null>(null);

  /** The choice awaiting confirmation in the side panel. */
  readonly pending = signal<PendingChoice | null>(null);

  // ---- data -------------------------------------------------------------

  private readonly aowsByCode = signal<Map<string, Unit[]>>(new Map());
  private readonly loadingCodes = signal<Set<string>>(new Set());
  private readonly tocByKey = signal<Map<string, any[]>>(new Map());
  /** Free-text filter for the "where to report" column. */
  readonly indicatorSearch = signal('');
  /** HLO groups collapsed in the third column. */
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

  /** HLO groups for the third column, filtered by the search box. */
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

  /** Answers so far, for the review screen. */
  readonly answers = computed(() => {
    const out: { screen: Screen; label: string; value: string }[] = [];
    if (this.path()) out.push({ screen: 'choice', label: 'Type', value: this.path() === 'planned' ? 'Planned in ToC' : 'Emerging' });
    if (this.program()) out.push({ screen: this.path() === 'planned' ? 'browse' : 'program', label: 'Program', value: this.program()!.initiativeCode });
    if (this.aow()) out.push({ screen: 'browse', label: 'Area of Work', value: this.aow()!.code });
    if (this.indicator()) out.push({ screen: 'browse', label: 'Indicator', value: this.indicator().indicator_description ?? '—' });
    return out;
  });

  constructor() {
    this.dataControlSE.focusMode.set(true);
    if (!this.homeSE.mySPsList().length && !this.homeSE.otherSPsList().length) {
      this.homeSE.getScienceProgramsProgress();
    }
    const prefill = this.prefillPath();
    if (prefill) {
      this.path.set(prefill);
      this.screen.set(prefill === 'planned' ? 'browse' : 'program');
    }
  }

  ngOnDestroy(): void {
    this.dataControlSE.focusMode.set(false);
  }

  // ---- selection → confirmation ------------------------------------------

  selectPath(value: ReportingPath): void {
    this.pending.set({
      kind: 'path',
      title: value === 'planned' ? 'Planned in the Theory of Change' : 'Emerging',
      subtitle: value === 'planned' ? 'Reported against a committed indicator' : 'Reported outside the committed indicators',
      body:
        value === 'planned'
          ? 'You will pick the Area of Work and the exact indicator this result contributes to. Its progress will count toward the target your program committed to.'
          : 'You will only pick the program. The result is recorded on its own, without contributing to a planned indicator.',
      accent: value === 'planned' ? '#6b6dc4' : '#bf4b26',
      icon: value === 'planned' ? 'flag' : 'bolt',
      payload: value
    });
  }

  selectProgram(sp: SPProgress): void {
    this.pending.set({
      kind: 'program',
      title: sp.initiativeCode,
      subtitle: sp.initiativeShortName || sp.initiativeName,
      body: `The result will belong to ${sp.initiativeCode} and appear in its reporting for this phase.`,
      accent: '#6b6dc4',
      icon: 'hub',
      payload: sp
    });
  }

  selectIndicator(ind: any): void {
    this.pending.set({
      kind: 'indicator',
      title: ind?.indicator_description ?? 'Indicator',
      subtitle: `${this.aow()?.code} · ${ind?.type_name || 'Not provided'}`,
      body: `Target ${ind?.target_value_sum ?? 0} · achieved ${ind?.actual_achieved_value_sum ?? 0} so far. Your result will contribute to this indicator.`,
      accent: '#6b6dc4',
      icon: 'insights',
      payload: ind
    });
  }

  cancelPending(): void {
    this.pending.set(null);
  }

  confirmPending(): void {
    const p = this.pending();
    if (!p) return;
    this.pending.set(null);

    if (p.kind === 'path') {
      const value = p.payload as ReportingPath;
      const changed = this.path() !== value;
      this.path.set(value);
      if (changed) {
        this.aow.set(null);
        this.indicator.set(null);
      }
      this.screen.set(value === 'planned' ? 'browse' : 'program');
      return;
    }

    if (p.kind === 'program') {
      const sp = p.payload as SPProgress;
      const previous = this.program();
      this.program.set(sp);
      // An Area of Work belongs to one program — a program change invalidates it.
      if (previous && previous.initiativeId !== sp.initiativeId) {
        this.aow.set(null);
        this.indicator.set(null);
      }
      this.loadAows(sp.initiativeCode);
      if (this.path() === 'emerging') this.screen.set('review');
      return;
    }

    this.indicator.set(p.payload);
    this.screen.set('review');
  }

  // ---- browsing ----------------------------------------------------------

  /** In the explorer, picking a program or an area of work is navigation, not a decision. */
  browseProgram(sp: SPProgress): void {
    const previous = this.program();
    this.program.set(sp);
    if (previous && previous.initiativeId !== sp.initiativeId) {
      this.aow.set(null);
      this.indicator.set(null);
    }
    this.loadAows(sp.initiativeCode);
  }

  browseAow(unit: Unit): void {
    this.aow.set(unit);
    this.indicator.set(null);
    this.clearFilters();
    const sp = this.program();
    if (sp) this.loadToc(sp.initiativeCode, unit.code);
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

  // ---- navigation --------------------------------------------------------

  back(): void {
    if (this.pending()) {
      this.pending.set(null);
      return;
    }
    switch (this.screen()) {
      case 'choice':
        this.close();
        break;
      case 'browse':
      case 'program':
        this.screen.set('choice');
        break;
      case 'review':
        this.screen.set(this.path() === 'planned' ? 'browse' : 'program');
        break;
    }
  }

  goTo(screen: Screen): void {
    this.pending.set(null);
    this.screen.set(screen);
  }

  close(): void {
    this.closed.emit();
  }

  /**
   * Hand off to the existing create surfaces with the collected context.
   * Planned → the Area of Work indicator list. Emerging → the program overview.
   */
  finish(): void {
    const sp = this.program();
    if (!sp) return;
    const target =
      this.path() === 'planned' && this.aow()
        ? ['/result-framework-reporting/entity-details', sp.initiativeCode, 'aow', this.aow()!.code]
        : ['/result-framework-reporting/entity-details', sp.initiativeCode];
    this.closed.emit();
    this.router.navigate(target);
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

  /** How the "where to report" column is rendered. */
  readonly listView = signal<'list' | 'table'>('list');

  setView(view: 'list' | 'table'): void {
    this.listView.set(view);
  }

  /** A stable icon + colour per Area of Work, so the rail is scannable when compact. */
  private readonly AOW_ICONS = ['insights', 'science', 'diversity_3', 'agriculture', 'public', 'hub', 'eco', 'bolt'];

  aowIcon(unit: Unit, index: number): string {
    return this.AOW_ICONS[index % this.AOW_ICONS.length];
  }

  aowAccent(index: number): string {
    const palette = ['#6b6dc4', '#2f8f6b', '#bf4b26', '#3b82f6', '#a6558f', '#c08a1e'];
    return palette[index % palette.length];
  }

  /** Each program keeps its own ring colour so the rail is readable at a glance. */
  accentFor(sp: SPProgress): string {
    const palette = ['#6b6dc4', '#bf4b26', '#1e202f', '#2f8f6b', '#a6558f', '#c08a1e', '#3b82f6', '#d0435a'];
    return palette[(sp.initiativeId ?? 0) % palette.length];
  }

  iconSrc(sp: SPProgress): string {
    return `/assets/result-framework-reporting/SPs-Icons/${sp.initiativeCode}.png`;
  }
}
