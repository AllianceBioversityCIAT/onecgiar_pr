import { NgTemplateOutlet } from '@angular/common';
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
  /** Display name of the source AoW — used when Intermediate Outcomes is a top-level sibling. */
  __aowName?: string;
}

/**
 * Top-level card on the Reporting tab.
 *
 * ⚠️ Intermediate Outcomes and 2030 Outcomes are SIBLINGS of AoWs (same chrome level), not
 * HLO-level children. The design reference nests them under each AoW — that is a known bug the
 * owner rejected; PRMS real data (and the previous entity-aow sidebar) treats them as program-level
 * buckets next to the Areas of Work list.
 */
export type ReportingGroupKind = 'aow' | 'intermediate' | '2030';

export interface ReportingAowGroup {
  aow: { id?: number | string; code: string; name: string; progress?: number };
  indicators: ReportingIndicator[];
  count: number;
  loading: boolean;
  kind?: ReportingGroupKind;
}

/** A row's workflow state, as far as the data allows. See `statusOf`. */
export type RowStatus = 'not-started' | 'in-progress' | 'achieved' | 'overachieved';

/** Collapsible group under a band (or bare under Intermediate / 2030). */
interface HloGroup {
  key: string;
  /** Display title — CURRENT shows the full ToC name only (no HLO + code chrome). */
  name: string;
  rows: ReportingIndicator[];
}

/**
 * CURRENT band inside an AoW card (`a.bands` in PRMS-Shell.dc.html ~3642):
 * "HIGH LEVEL OUTPUTS · N KPIs" then group rows; then "OUTCOMES · N KPIs".
 * Intermediate / 2030 cards use a single band with `hasEyebrow: false`.
 */
interface IndicatorBand {
  key: string;
  eyebrow: string;
  hasEyebrow: boolean;
  groups: HloGroup[];
}

/**
 * Reporting tab — the AoW → HLO → indicator table.
 *
 * Layout is the approved reference verbatim: `docs/reporting-redesign/PROGRAM-SHELL-SPEC.md` §5,
 * read from `docs/design-references/prms-shell-CURRENT/PRMS-Shell.dc.html` (+ uploads PNGs).
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
  imports: [NgIcon, NgTemplateOutlet, PrTooltipDirectiveModule],
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
  /**
   * `grouped` = AoW (or bucket) cards with HLO/sub-group rows.
   * `flat` = one list of every visible indicator, no card chrome.
   */
  readonly viewMode = input<'grouped' | 'flat'>('grouped');
  /** Whether the current user may report — the parent passes `canReportResults()` through. */
  readonly canReport = input<boolean>(false);

  readonly openAow = output<string>();
  readonly openRow = output<ReportingIndicator>();
  readonly reportRow = output<ReportingIndicator>();
  readonly openTarget = output<ReportingIndicator>();
  readonly openAchieved = output<ReportingIndicator>();
  readonly openRowMenu = output<{ row: ReportingIndicator; event: MouseEvent }>();

  /**
   * Disclosure = a user override on top of a level default (see `isDefaultOpenAow` /
   * `isDefaultOpenHlo`). The reference seeds NO expanded card and EVERY expanded sub-group.
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

  /**
   * True once the API actually sent an achieved figure. `null` / `undefined` mean NOTHING WAS
   * REPORTED and render as an em dash; a literal `0` is a reported fact and renders as `0`.
   */
  hasAchievedValue(row: ReportingIndicator): boolean {
    const raw = row?.actual_achieved_value_sum;
    if (raw === null || raw === undefined || (raw as unknown) === '') return false;
    return Number.isFinite(typeof raw === 'number' ? raw : parseFloat(String(raw)));
  }

  /**
   * Nothing to celebrate in the Achieved cell — either no figure arrived at all, or the figure is
   * a zero. Drives the muted colour and the reference's `achievedTip`
   * ("Nothing reported yet for this indicator", `PRMS Reporting.dc.html` :4067).
   */
  achievedIsEmpty(row: ReportingIndicator): boolean {
    return !this.hasAchievedValue(row) || Number(row?.actual_achieved_value_sum) === 0;
  }

  achievedTooltip(row: ReportingIndicator): string {
    return this.achievedIsEmpty(row) ? 'Nothing reported yet for this indicator' : '';
  }

  /**
   * The secondary line under the title = the INDICATOR NAME (`row.kpiName` in the reference,
   * `PRMS Reporting.dc.html` :1306).
   *
   * An earlier pass used the category ("Knowledge product") on the belief that the API carries no
   * short name. It does: `/api/results-framework-reporting/toc-results` sends BOTH `type_name` (the
   * indicator name, e.g. "Number of knowledge products published and quality-assured") and
   * `result_type_name` (the category). So `type_name` leads, with the category as the fallback for
   * the rows where it is null.
   */
  indicatorNameOf(row: ReportingIndicator): string {
    return row?.type_name || row?.result_type_name || 'Not provided';
  }

  /** Meta under the title — the indicator name; in flat view the AoW code prefixes it. */
  metaLine(row: ReportingIndicator, showAow = false): string {
    const name = this.indicatorNameOf(row);
    if (!showAow) return name;
    const aow = row.__aowCode?.trim();
    return aow ? `${aow} · ${name}` : name;
  }

  /**
   * "Show more" only when the title actually overflows two lines (~110 chars at 15px/600).
   * Short titles must never show a useless control (CURRENT row.showMore).
   */
  needsShowMore(row: ReportingIndicator): boolean {
    const t = (row?.indicator_description ?? '').trim();
    return t.length > 110;
  }

  // ── Grouping ──────────────────────────────────────────────────────────────
  /**
   * CURRENT organisation inside a top-level card (PRMS-Shell.dc.html `a.bands` ~3642):
   *
   * - **AoW** → two bands when data exists:
   *     HIGH LEVEL OUTPUTS · N KPIs  → collapsible ToC groups (name only)
   *     OUTCOMES · N KPIs            → collapsible outcome groups
   * - **Intermediate / 2030** → one band, no eyebrow (groups only). Program-level siblings
   *   of AoWs — never nested under an AoW card.
   */
  bandsOf(group: ReportingAowGroup): IndicatorBand[] {
    const kind = group.kind ?? 'aow';
    const rows = this.visibleRows(group);

    if (kind === 'aow') {
      const hloRows = rows.filter(r => r.__tier !== 'outcome');
      const outRows = rows.filter(r => r.__tier === 'outcome');
      const bands: IndicatorBand[] = [];
      if (hloRows.length) {
        bands.push({
          key: `${group.aow.code}::band-hlo`,
          eyebrow: 'High level outputs',
          hasEyebrow: true,
          groups: this.clusterByTitle(hloRows, `${group.aow.code}::hlo`)
        });
      }
      if (outRows.length) {
        bands.push({
          key: `${group.aow.code}::band-out`,
          eyebrow: 'Outcomes',
          hasEyebrow: true,
          groups: this.clusterByTitle(outRows, `${group.aow.code}::out`)
        });
      }
      return bands;
    }

    if (kind === 'intermediate') {
      return [
        {
          key: 'band-io',
          eyebrow: '',
          hasEyebrow: false,
          groups: this.clusterByTitle(
            rows.map(r => ({
              ...r,
              // Prefer the intermediate ToC title; fall back to source AoW name.
              __hlo: r.__hlo?.trim() || r.__aowName?.trim() || 'Intermediate outcome'
            })),
            'io'
          )
        }
      ];
    }

    // 2030
    return [
      {
        key: 'band-o30',
        eyebrow: '',
        hasEyebrow: false,
        groups: this.clusterByTitle(
          rows.map(r => ({
            ...r,
            __hlo: r.__hlo?.trim() || '2030 Outcomes'
          })),
          'o30'
        )
      }
    ];
  }

  /**
   * Cluster indicators by ToC title. Display name is the full descriptive title (CURRENT `g.name`).
   * Leading codes like `HL04.AOW1.I01` are stripped when present so the row reads as a sentence.
   */
  private clusterByTitle(rows: ReportingIndicator[], keyPrefix: string): HloGroup[] {
    const byKey = new Map<string, HloGroup>();
    for (const row of rows) {
      const raw = row.__hlo?.trim() || 'Unassigned';
      const match = /^((?:HLO|HL|IO|EOI)[\w.\-]*)\s+(.*)$/i.exec(raw);
      const name = (match?.[2] || raw).trim() || raw;
      const key = `${keyPrefix}::${raw}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, name, rows: [] });
      }
      byKey.get(key)!.rows.push(row);
    }
    return [...byKey.values()];
  }

  /** KPI count for a band header (`4 KPIs`). */
  bandKpiCount(band: IndicatorBand): number {
    return band.groups.reduce((n, g) => n + g.rows.length, 0);
  }

  /**
   * Flat list of every group (all bands). Kept for tests / callers that do not need band chrome.
   */
  hloGroupsOf(group: ReportingAowGroup): HloGroup[] {
    return this.bandsOf(group).flatMap(b => b.groups);
  }

  /** Flat list of every indicator that survives the toolbar filters (All indicators view). */
  readonly flatRows = computed(() => {
    const rows: ReportingIndicator[] = [];
    for (const g of this.visibleGroups()) {
      rows.push(...this.visibleRows(g));
    }
    return rows;
  });

  /** Whether this top-level card is a program-level bucket (not a real AoW). */
  isBucket(group: ReportingAowGroup): boolean {
    const kind = group.kind ?? 'aow';
    return kind === 'intermediate' || kind === '2030';
  }

  /**
   * Chip label in the 68px header. AoW → code (AOW01). Buckets → the short tag ("Intermediate",
   * "2030"), exactly as the reference (:4248).
   *
   * The chip is deliberately NOT the full noun phrase: the group's own name renders right next to
   * it, so "Intermediate outcomes" in both slots read as "Intermediate outcomes │ Intermediate
   * outcomes". The chip qualifies the name, it does not repeat it.
   */
  headerChip(group: ReportingAowGroup): string {
    const kind = group.kind ?? 'aow';
    if (kind === 'intermediate') return 'Intermediate';
    if (kind === '2030') return '2030';
    return group.aow.code;
  }

  /**
   * Chip colours from CURRENT: Intermediate indigo soft, 2030 teal soft.
   * AoW keeps the brand-soft violet chip.
   */
  headerChipClass(group: ReportingAowGroup): string {
    const kind = group.kind ?? 'aow';
    if (kind === 'intermediate') {
      return 'bg-[#E0E7FF] text-[#3730A3]';
    }
    if (kind === '2030') {
      return 'bg-[#D1FAE5] text-[#0F766E]';
    }
    return 'bg-[var(--pr-color-primary-100)] text-[var(--pr-color-primary-400)]';
  }

  /** Rows surviving the toolbar filters. */
  visibleRows(group: ReportingAowGroup): ReportingIndicator[] {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return (group.indicators ?? []).filter(row => {
      if (status !== 'all' && this.statusOf(row) !== status) return false;
      if (!q) return true;
      // Both name fields are searched: the visible meta line is the indicator name now, but users
      // still type categories ("innovation use"), which only live in `result_type_name`.
      return [row.indicator_description, row.__hlo, this.indicatorNameOf(row), row.result_type_name].some(v =>
        (v ?? '').toLowerCase().includes(q)
      );
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
   * Default disclosure, read from the reference's seed state (`PRMS Reporting.dc.html` :3265):
   *
   * ```js
   * expandedAows: {},                       // every card starts COLLAPSED (68px header only)
   * expandedGroups: { …every group: true }  // every sub-group starts OPEN
   * ```
   *
   * So the page opens as a scannable list of card headers, and the moment a user expands one they
   * see its rows — not a second wall of collapsed group headers. Auto-opening the first AoW (the
   * previous behaviour) made the very first card the odd one out and pushed the rest below the fold.
   */
  isDefaultOpenAow(): boolean {
    return false;
  }

  isDefaultOpenHlo(): boolean {
    return true;
  }

  /**
   * Top-level cards with something to show. With no search/status filter, every card the parent
   * built is kept (including empty AoWs). Once a filter is active, empty cards drop out so the
   * list does not fill with dead headers.
   */
  readonly visibleGroups = computed(() => {
    const q = this.search().trim();
    const status = this.statusFilter();
    if (!q && status === 'all') return this.groups();
    return this.groups().filter(g => g.loading || this.visibleRows(g).length > 0);
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
