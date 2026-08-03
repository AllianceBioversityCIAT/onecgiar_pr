import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideCheck, lucideEllipsis, lucideInfo } from '@ng-icons/lucide';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';

/** One indicator row, as `dashboard-lab.indicatorsByAow()` already produces it. */
export interface ReportingIndicator {
  indicator_id: number;
  indicator_description?: string;
  target_value_sum?: string | number;
  actual_achieved_value_sum?: number;
  progress_percentage?: string | number;
  unit_messurament?: string;
  result_type_name?: string;
  type_name?: string;
  center_id?: string;
  center_acronym?: string;
  toc_result_id?: number;
  __hlo?: string;
  __tier?: 'output' | 'outcome';
  __aowCode?: string;
}

export interface ReportingAowGroup {
  aow: { id?: number | string; code: string; name: string; progress?: number };
  indicators: ReportingIndicator[];
  count: number;
  loading: boolean;
}

/** A row's workflow state, as far as the data allows. See `statusOf`. */
export type RowStatus = 'not-started' | 'in-progress' | 'achieved' | 'overachieved';

interface HloGroup {
  key: string;
  eyebrow: string;
  code: string;
  name: string;
  rows: ReportingIndicator[];
}

/**
 * Reporting tab — the AoW → HLO → indicator table.
 *
 * Layout is the approved reference verbatim: `docs/reporting-redesign/PROGRAM-SHELL-SPEC.md` §5,
 * read from `docs/design-references/prms-reporting-tool-mockup/Resultados.dc.html:960-1150`.
 *
 * ⚠️ Sizes are absolute px on purpose. `html` is 12px in this app, so a rem-based Tailwind type
 * utility renders 25% small — `text-sm` would be 10.5px, not 14px (UI-RULES §1.3).
 *
 * This component is PRESENTATION ONLY. It owns no fetching and no service: the parent passes the
 * groups `indicatorsByAow()` already computes, and every action leaves through an output. That keeps
 * it testable without the 287-LOC EntityAowService and reusable from the Results Center later.
 */
@Component({
  selector: 'app-reporting-aow-table',
  standalone: true,
  imports: [NgIcon, PrTooltipDirectiveModule],
  templateUrl: './reporting-aow-table.component.html',
  styleUrls: ['./reporting-aow-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideChevronDown, lucideCheck, lucideEllipsis, lucideInfo })]
})
export class ReportingAowTableComponent {
  readonly groups = input.required<ReportingAowGroup[]>();
  /** Free-text filter, owned by the parent toolbar. Matched against the title and the indicator. */
  readonly search = input<string>('');
  /** `'all'` or one of the RowStatus values. */
  readonly statusFilter = input<string>('all');
  /** Whether the current user may report — the parent passes `canReportResults()` through. */
  readonly canReport = input<boolean>(false);

  readonly openAow = output<string>();
  readonly openRow = output<ReportingIndicator>();
  readonly reportRow = output<ReportingIndicator>();
  readonly openTarget = output<ReportingIndicator>();
  readonly openAchieved = output<ReportingIndicator>();
  readonly openRowMenu = output<{ row: ReportingIndicator; event: MouseEvent }>();

  /**
   * Disclosure = a user override on top of a per-index default. The rendered reference opens only
   * the FIRST AoW and, inside it, only the FIRST sub-group; everything else is collapsed.
   */
  private readonly overrides = signal<ReadonlyMap<string, boolean>>(new Map());
  /** Row titles the user expanded past the 2-line clamp. */
  private readonly expandedTitles = signal<ReadonlySet<number>>(new Set());

  // ── Status ────────────────────────────────────────────────────────────────
  /**
   * The reference has a five-state workflow enum (not started / in progress / submitted / in QA /
   * approved). The API carries no per-indicator workflow status — only `progress_percentage` — so
   * "submitted" and "in QA" are NOT derivable and are deliberately not faked. This maps the four
   * states the data does support, matching `aow-hlo-table`'s existing thresholds exactly so both
   * surfaces agree.
   */
  statusOf(row: ReportingIndicator): RowStatus {
    const p = this.progressOf(row);
    if (p > 100) return 'overachieved';
    if (p === 100) return 'achieved';
    if (p >= 1) return 'in-progress';
    return 'not-started';
  }

  progressOf(row: ReportingIndicator): number {
    const raw = row?.progress_percentage;
    if (raw === null || raw === undefined) return 0;
    const n = parseFloat(String(raw));
    return Number.isFinite(n) ? n : 0;
  }

  statusLabel(row: ReportingIndicator): string {
    return { 'not-started': 'Not started', 'in-progress': 'In progress', achieved: 'Achieved', overachieved: 'Overachieved' }[
      this.statusOf(row)
    ];
  }

  /**
   * Rule 17: the action reflects state — `Report` when nothing is in yet, `Continue` while in
   * progress, and NO button once the target is met.
   */
  actionLabel(row: ReportingIndicator): string | null {
    const s = this.statusOf(row);
    if (s === 'achieved' || s === 'overachieved') return null;
    return s === 'in-progress' ? 'Continue' : 'Report';
  }

  // ── Figures ───────────────────────────────────────────────────────────────
  /**
   * `target_value_sum` arrives as a STRING and `unit_messurament` arrives dirty in production
   * ('Number', 'Number\t', 'NUMBER', ' Number ', 'Percentage'…), so both are normalised here.
   * An em dash is shown for "nothing", never a bare 0 — 0 and "not reported" are different facts.
   */
  figure(value: string | number | null | undefined, unit?: string): string {
    if (value === null || value === undefined || value === '') return '—';
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(n)) return '—';
    const pct = (unit ?? '').trim().toLowerCase().startsWith('percent');
    const shown = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return pct ? `${shown}%` : shown;
  }

  targetText(row: ReportingIndicator): string {
    return this.figure(row?.target_value_sum, row?.unit_messurament);
  }

  achievedText(row: ReportingIndicator): string {
    return this.figure(row?.actual_achieved_value_sum, row?.unit_messurament);
  }

  /** The secondary line: the indicator's typology, falling back through the two fields that carry it. */
  typologyOf(row: ReportingIndicator): string {
    return row?.result_type_name || row?.type_name || 'Not provided';
  }

  // ── Grouping ──────────────────────────────────────────────────────────────
  /**
   * Splits an AoW's flat indicator list into the reference's sub-groups, keyed by HLO title.
   * `__tier` decides the eyebrow: outputs are HLOs, outcomes are outcomes. The reference's own
   * codes travel inside the title ("HLO4.AOW1.IO1 Foster motivations"), so the code chip and the
   * short name come from splitting it — no extra request.
   */
  hloGroupsOf(group: ReportingAowGroup): HloGroup[] {
    const byKey = new Map<string, HloGroup>();
    for (const row of this.visibleRows(group)) {
      const title = row.__hlo?.trim() || 'Unassigned';
      const key = `${group.aow.code}::${title}`;
      if (!byKey.has(key)) {
        const match = /^((?:HLO|IO|EOI)[\w.\-]*)\s+(.*)$/i.exec(title);
        byKey.set(key, {
          key,
          eyebrow: row.__tier === 'outcome' ? 'Outcome' : 'HLO',
          code: match?.[1] ?? '',
          name: match?.[2] ?? title,
          rows: []
        });
      }
      byKey.get(key)!.rows.push(row);
    }
    return [...byKey.values()];
  }

  /** Rows surviving the toolbar filters. */
  visibleRows(group: ReportingAowGroup): ReportingIndicator[] {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return (group.indicators ?? []).filter(row => {
      if (status !== 'all' && this.statusOf(row) !== status) return false;
      if (!q) return true;
      return [row.indicator_description, row.__hlo, this.typologyOf(row)].some(v => (v ?? '').toLowerCase().includes(q));
    });
  }

  /**
   * The AoW header ratio — `3 of 8 · 38%` in the reference.
   *
   * `done` counts KPIs with SOMETHING REPORTED, not KPIs that reached 100%. Verified against the
   * designer's rendered reference (uploads/pasted-1785766366426-0.png): 3/8 = 37.5% ≈ the 38% shown.
   * Counting completions instead produced "0 of 30 · 0%" on real data — technically true and
   * completely useless, since almost nothing is ever at 100% mid-cycle.
   *
   * Counted over the UNFILTERED set on purpose: a progress figure that moves when you type in a
   * search box is not progress, it is a coincidence.
   */
  ratioOf(group: ReportingAowGroup): { done: number; total: number; percent: number } {
    const all = group.indicators ?? [];
    const done = all.filter(r => Number(r?.actual_achieved_value_sum ?? 0) > 0).length;
    const total = all.length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  countLabel(n: number, noun = 'KPI'): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  }

  /**
   * Default disclosure, from the rendered reference: only the FIRST AoW is expanded, and inside it
   * only the FIRST sub-group. Everything else is collapsed. Expanding all of it (the first pass)
   * buried the page in rows and made the AoW headers useless as an overview.
   */
  isDefaultOpenAow(index: number): boolean {
    return index === 0;
  }

  isDefaultOpenHlo(index: number): boolean {
    return index === 0;
  }

  /** AoWs with at least one visible row, so filtering empties the list instead of showing dead cards. */
  readonly visibleGroups = computed(() => {
    const q = this.search().trim();
    const status = this.statusFilter();
    if (!q && status === 'all') return this.groups();
    return this.groups().filter(g => this.visibleRows(g).length > 0);
  });

  // ── Disclosure ────────────────────────────────────────────────────────────
  /** `defaultOpen` comes from the index: first-of-level is open, the rest closed. */
  isOpen(key: string, defaultOpen = false): boolean {
    return this.overrides().get(key) ?? defaultOpen;
  }

  toggle(key: string, defaultOpen = false): void {
    const now = this.isOpen(key, defaultOpen);
    this.overrides.update(map => new Map(map).set(key, !now));
  }

  isTitleExpanded(id: number): boolean {
    return this.expandedTitles().has(id);
  }

  toggleTitle(id: number, ev: Event): void {
    // The whole row is clickable, so a Show more click must not also open the drawer.
    ev.stopPropagation();
    this.expandedTitles.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Stops a cell's own action from bubbling into the row-opens-the-drawer handler. */
  emitAndStop<T>(emitter: { emit: (v: T) => void }, value: T, ev: Event): void {
    ev.stopPropagation();
    emitter.emit(value);
  }
}
