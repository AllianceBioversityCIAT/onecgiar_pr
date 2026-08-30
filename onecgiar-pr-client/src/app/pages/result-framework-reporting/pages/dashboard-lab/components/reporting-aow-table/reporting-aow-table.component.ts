import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, input, linkedSignal, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideChevronDown, lucideCheck, lucideEllipsis, lucideInfo, lucideLink, lucideX } from '@ng-icons/lucide';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import {
  PrTableComponent,
  PrSortableColumnDirective,
  PrSortIconComponent,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from '../../../../../../shared/components/pr-table';
import { buildRatio, pendingOf } from '../../reporting-burndown';

/**
 * `__aowCode` values for the two program-level buckets (Intermediate Outcomes / 2030 Outcomes) —
 * mirrors `INTERMEDIATE_OUTCOMES_CODE` / `OUTCOMES_2030_CODE` in `dashboard-lab.component.ts`.
 * Duplicated (not imported) because the host is not exported and importing it here would create a
 * circular dependency (the host already imports `ReportingIndicator`/`ReportingAowGroup` from this
 * file). Keep both lists in sync if either sentinel value ever changes.
 */
const COPY_LINK_UNSUPPORTED_AOW_CODES: ReadonlySet<string> = new Set(['intermediate-outcomes', '2030-outcomes']);

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
  /**
   * True when this row's underlying ToC outcome node is cross-cutting (not scoped to a single AoW) —
   * stamped by `dashboard-lab.indicatorsByAow()`'s `fromTier` for `__tier === 'outcome'` rows only,
   * from the backend's group-level `is_aow` field (RES-R-3, RES-DD-2).
   */
  __isIntermediateCrosscut?: boolean;
}

/**
 * Top-level card on the Reporting tab.
 *
 * ⚠️ Intermediate Outcomes and 2030 Outcomes are SIBLINGS of AoWs (same chrome level), not
 * HLO-level children.
 *
 * The rest of this note used to say the design nested them under each AoW and that the owner had
 * rejected it. Re-checked against the LIVE design on 2026-08-21 (P2-3405): `repCards` is a flat list
 * and its `a.hasTag` branch renders exactly these sibling cards, so code and design AGREE. Kept as a
 * warning only so nobody reads a stale note and "fixes" this by nesting them.
 * See docs/DESIGN-DEVIATIONS.md §10.
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

/**
 * A flat-table row: the indicator plus the PRE-NORMALISED sort keys the table sorts on.
 *
 * `app-pr-table` sorts resolved values with `<` / `>` and has no comparator hook, so sorting the
 * raw fields would compare `target_value_sum` as the STRING the API sends ("9" > "100") and would
 * scatter the em-dash rows. The keys below are computed once per row instead: numbers for the two
 * figures, a rank for the status, `-Infinity` for "nothing reported" so those rows group at one end
 * of the order rather than masquerading as zero.
 */
export interface ReportingFlatRow extends ReportingIndicator {
  __sortTarget: number;
  __sortAchieved: number;
  __sortStatus: number;
  __statusKey: RowStatus;
  __statusText: string;
  __typeLabel: string;
  __centerLabel: string;
}

/** Collapsible group under a band (or bare under Intermediate / 2030). */
interface HloGroup {
  key: string;
  /** Display title — the design shows the full ToC name only (no HLO + code chrome). */
  name: string;
  rows: ReportingIndicator[];
}

/**
 * A band inside an AoW card, in the order the approved design gives them:
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
 * Layout is the approved design, three levels of grouping: the AoW header on the card surface with
 * a strong bottom border, the HLO header on the subtle surface with its eyebrow, name and
 * right-aligned count, then the rows. The first level carries typographic weight and the second
 * carries fill — they must never compete on the same variable — and there are no vertical spine
 * lines anywhere in the tree.
 *
 * ⚠️ Sizes are absolute px on purpose. `html` is 12px in this app, so a rem-based Tailwind type
 * utility renders 25% small — `text-sm` would be 10.5px, not 14px.
 *
 * This component is PRESENTATION ONLY. It owns no fetching and no service: the parent passes the
 * groups `indicatorsByAow()` already computes, and every action leaves through an output. That keeps
 * it testable without the 287-LOC EntityAowService and reusable from the Results Center later.
 */
@Component({
  selector: 'app-reporting-aow-table',
  standalone: true,
  imports: [
    NgIcon,
    NgTemplateOutlet,
    PrTooltipDirectiveModule,
    PrTableComponent,
    PrSortableColumnDirective,
    PrSortIconComponent,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective
  ],
  templateUrl: './reporting-aow-table.component.html',
  styleUrls: ['./reporting-aow-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideArrowDown, lucideChevronDown, lucideCheck, lucideEllipsis, lucideInfo, lucideLink, lucideX })]
})
export class ReportingAowTableComponent {
  readonly groups = input.required<ReportingAowGroup[]>();
  /** Free-text filter, owned by the parent toolbar. Matched against the title and the indicator. */
  readonly search = input<string>('');
  /** `'all'` or one of the RowStatus values. */
  readonly statusFilter = input<string>('all');
  /**
   * Whether ANY toolbar control is narrowing the list right now — search, Section, Type, Category
   * or Status.
   *
   * ⚠️ This cannot be derived here. Only `search` and `statusFilter` reach this component; the
   * Section / Type / Category filters are applied by the host while it builds `groups`, so a card
   * emptied by Category arrives looking exactly like an Area of Work that has no planned indicators
   * at all. Inferring from the two inputs we do have is what made the empty state claim "this area
   * of work has no planned indicators yet" about a card that has plenty (P2-3405). The host owns the
   * answer and passes it down.
   */
  readonly filtersActive = input<boolean>(false);
  /**
   * `grouped` = AoW (or bucket) cards with HLO/sub-group rows.
   * `flat` = one list of every visible indicator, no card chrome.
   */
  readonly viewMode = input<'grouped' | 'flat'>('grouped');
  /** Whether the current user may report — the parent passes `canReportResults()` through. */
  readonly canReport = input<boolean>(false);
  /**
   * Global disclosure switch owned by the toolbar (`Expand all` / `Collapse all`, P2-3252).
   *
   * It moves the LEVEL DEFAULT, it does not write one entry per card: flipping it drops the user's
   * per-card overrides (see `overrides`), so `true` opens every AoW and every sub-group at once and
   * `false` puts the whole list back to the collapsed reading state.
   */
  readonly expandAll = input<boolean>(false);
  /**
   * Identity of the data the disclosure state belongs to — the programme code in practice.
   * Changing it resets every override so a newly opened Science Program starts collapsed (P2-3251);
   * the shell reuses this component across programmes, and the AoW codes are not unique between them.
   */
  readonly scopeKey = input<string>('');
  /**
   * Bumped by the host on every press of Expand all / Collapse all.
   *
   * `expandAll` alone cannot drive the switch: when the user has already opened every card BY HAND
   * the host asks for the state the boolean is ALREADY in, the input never changes, and the press
   * would do nothing while the label flipped — the dead click QA rejected. The nonce is part of the
   * override-reset key, so a press always re-seeds the list from the level default.
   */
  readonly expandAllNonce = input<number>(0);
  /**
   * The KPI whose report surface (drawer or legacy modal) just closed, published by the host —
   * inherited from the By-AOW cards (MRF-R-3.1): that row offers "Next pending" until the next
   * report. `null` before the session's first report.
   */
  readonly lastReported = input<{ id: unknown; aowCode: string } | null>(null);

  readonly openAow = output<string>();
  readonly openRow = output<ReportingIndicator>();
  readonly reportRow = output<ReportingIndicator>();
  readonly openTarget = output<ReportingIndicator>();
  readonly openAchieved = output<ReportingIndicator>();
  /** "Copy link" row-menu action (MRF-R-5) — the host builds/copies the composite URL, this
   * component only tells it which row. @akili-spec changes/mass-reporting-flow */
  readonly copyLink = output<ReportingIndicator>();
  /**
   * Emitted by the empty state's `Clear filters` control. The host owns all five filter signals, so
   * resetting them is its job — this component only asks.
   */
  readonly clearFilters = output<void>();
  /**
   * Announces whether EVERY visible top-level card is open right now — overrides included, not just
   * the level default. The toolbar label is written from this, so it always describes what the next
   * press will actually do (P2-3252).
   */
  readonly allOpenChange = output<boolean>();

  /**
   * Disclosure = a user override on top of a level default (see `isDefaultOpenAow` /
   * `isDefaultOpenHlo`). The reference seeds NO expanded card and EVERY expanded sub-group.
   *
   * Every override is dropped whenever the global Expand all / Collapse all switch flips, or when
   * the surface moves to another programme: the level default takes over again, so one click puts
   * the WHOLE list in the requested state instead of leaving the cards the user had touched behind
   * (P2-3252), and AoW codes repeat across programmes (`AOW01` exists in every SP), so keeping the
   * map would leak one programme's open cards into the next (P2-3251).
   */
  private readonly overrides = linkedSignal<string, ReadonlyMap<string, boolean>>({
    source: () => `${this.scopeKey()}::${this.expandAll()}::${this.expandAllNonce()}`,
    computation: () => new Map()
  });
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
   * a zero. Drives the muted colour and the design's empty-state tip,
   * "Nothing reported yet for this indicator".
   */
  achievedIsEmpty(row: ReportingIndicator): boolean {
    return !this.hasAchievedValue(row) || Number(row?.actual_achieved_value_sum) === 0;
  }

  achievedTooltip(row: ReportingIndicator): string {
    return this.achievedIsEmpty(row) ? 'Nothing reported yet for this indicator' : '';
  }

  /**
   * Copy for the Target-cell tooltip shown on Intermediate Outcome rows only — those rows are
   * program-wide, never scoped to a single AoW, and the Target figure gives no hint of that
   * without this (RES-R-1, RES-R-2, RES-AC-1, RES-AC-2).
   */
  readonly intermediateTargetTooltip = 'This target is not exclusive to that AoW.';

  /** True when the row's card is the Intermediate Outcomes bucket (`group.kind === 'intermediate'`). */
  isIntermediateRow(bucketKind: string): boolean {
    return bucketKind === 'intermediate';
  }

  /**
   * True when an `aow` card's Outcomes-band row is a cross-cutting Intermediate Outcome that also
   * appears in the Intermediate Outcomes card (RES-R-3, RES-DD-2). Driven by the `__isIntermediateCrosscut`
   * stamp `dashboard-lab.indicatorsByAow()` adds from the backend's `is_aow` field.
   */
  isCrossCuttingIntermediate(row: ReportingIndicator): boolean {
    return !!row?.__isIntermediateCrosscut;
  }

  /**
   * The secondary line under the title = the INDICATOR NAME (the design's `kpiName` on a row).
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

  /**
   * Sanitises the AoW code for display: returns null for program-level outcome buckets
   * ('intermediate-outcomes', '2030-outcomes') so they render as clean dashes instead of long labels.
   */
  aowCodeOf(row: ReportingIndicator): string | null {
    const code = row?.__aowCode?.trim();
    if (!code || COPY_LINK_UNSUPPORTED_AOW_CODES.has(code)) return null;
    return code;
  }

  /** Meta under the title — the indicator name; in flat view the AoW code prefixes it. */
  metaLine(row: ReportingIndicator, showAow = false): string {
    const name = this.indicatorNameOf(row);
    if (!showAow) return name;
    const aow = this.aowCodeOf(row);
    return aow ? `${aow} · ${name}` : name;
  }

  /**
   * "Show more" only when the title actually overflows two lines (~110 chars at 15px/600).
   * Short titles must never show a useless control.
   */
  needsShowMore(row: ReportingIndicator): boolean {
    const t = (row?.indicator_description ?? '').trim();
    return t.length > 110;
  }

  // ── Grouping ──────────────────────────────────────────────────────────────
  /**
   * Organisation inside a top-level card, as the approved design lays it out:
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
   * Cluster indicators by ToC title. Display name is the full descriptive title, as the design shows it.
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
   * Chip colours from the design: Intermediate indigo soft, 2030 green soft. AoW keeps the
   * brand-soft violet chip. Tokens only — see the --pr-chip-* block in styles/colors.scss for why
   * the 2030 pair is not --pr-status-approved-*.
   */
  headerChipClass(group: ReportingAowGroup): string {
    const kind = group.kind ?? 'aow';
    if (kind === 'intermediate') {
      return 'bg-[var(--pr-chip-intermediate-bg)] text-[var(--pr-chip-intermediate-fg)]';
    }
    if (kind === '2030') {
      return 'bg-[var(--pr-chip-2030-bg)] text-[var(--pr-chip-2030-fg)]';
    }
    return 'bg-[var(--pr-color-primary-100)] text-[var(--pr-color-primary-400)]';
  }

  /** Local breakdown filter by Center per AoW / bucket group key. */
  private readonly localCenterFilter = signal<Record<string, string>>({});
  /** Local breakdown filter by Result Type per AoW / bucket group key. */
  private readonly localTypeFilter = signal<Record<string, string>>({});

  groupKey(group: ReportingAowGroup): string {
    return group?.aow?.code ?? '';
  }

  selectedCenterOf(group: ReportingAowGroup): string | null {
    return this.localCenterFilter()[this.groupKey(group)] ?? null;
  }

  setCenterFilter(group: ReportingAowGroup, center: string | null): void {
    const key = this.groupKey(group);
    const curr = this.localCenterFilter();
    if (!center || curr[key] === center) {
      const copy = { ...curr };
      delete copy[key];
      this.localCenterFilter.set(copy);
    } else {
      this.localCenterFilter.set({ ...curr, [key]: center });
    }
  }

  selectedTypeOf(group: ReportingAowGroup): string | null {
    return this.localTypeFilter()[this.groupKey(group)] ?? null;
  }

  setTypeFilter(group: ReportingAowGroup, type: string | null): void {
    const key = this.groupKey(group);
    const curr = this.localTypeFilter();
    if (!type || curr[key] === type) {
      const copy = { ...curr };
      delete copy[key];
      this.localTypeFilter.set(copy);
    } else {
      this.localTypeFilter.set({ ...curr, [key]: type });
    }
  }

  centerCountsOf(group: ReportingAowGroup): { center: string; count: number }[] {
    const map = new Map<string, number>();
    for (const ind of group.indicators ?? []) {
      const c = ind.center_acronym?.trim();
      if (c && c !== '—') {
        map.set(c, (map.get(c) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([center, count]) => ({ center, count }))
      .sort((a, b) => b.count - a.count || a.center.localeCompare(b.center));
  }

  typeCountsOf(group: ReportingAowGroup): { type: string; count: number }[] {
    const map = new Map<string, number>();
    for (const ind of group.indicators ?? []) {
      const t = ind.result_type_name?.trim();
      if (t && t !== '—') {
        map.set(t, (map.get(t) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }

  hloJumpList(group: ReportingAowGroup): { key: string; name: string; count: number }[] {
    const bands = this.bandsOf(group);
    const list: { key: string; name: string; count: number }[] = [];
    for (const band of bands) {
      for (const g of band.groups) {
        list.push({ key: g.key, name: g.name, count: g.rows.length });
      }
    }
    return list;
  }

  jumpToHlo(hloKey: string): void {
    if (!this.isOpen(hloKey, this.isDefaultOpenHlo())) {
      this.toggle(hloKey, this.isDefaultOpenHlo());
    }
    setTimeout(() => {
      const el = document.getElementById(`hlo-group-${hloKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  /** Rows surviving the toolbar filters + optional in-card breakdown filters. */
  visibleRows(group: ReportingAowGroup): ReportingIndicator[] {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const selCenter = this.selectedCenterOf(group);
    const selType = this.selectedTypeOf(group);

    return (group.indicators ?? []).filter(row => {
      if (status !== 'all' && this.statusOf(row) !== status) return false;
      if (selCenter && row.center_acronym?.trim() !== selCenter) return false;
      if (selType && row.result_type_name?.trim() !== selType) return false;
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
   * `done` counts KPIs with SOMETHING REPORTED, not KPIs that reached 100%. That is the only
   * reading under which the design's own worked example adds up: 3 of 8 = 37.5%, shown as 38%.
   * Counting completions instead produced "0 of 30 · 0%" on real data — technically true and
   * completely useless, since almost nothing is ever at 100% mid-cycle.
   *
   * Counted over the UNFILTERED set on purpose: a progress figure that moves when you type in a
   * search box is not progress, it is a coincidence. `group.indicators` is that unfiltered set —
   * EXCEPT when the host's Only-pending toggle is on, in which case it has already been narrowed
   * and the host stashes the pre-toggle set on `__allIndicators` (see
   * `dashboard-lab.applyBurndownFilterAndSort`); prefer that side-channel field when present.
   *
   * Delegates to `buildRatio` (`reporting-burndown.ts`) so this and the By-AOW banner's
   * `buildAowBannerStats` apply the zero-target rule identically (MRF-R-6/R-7, MRF-AC-5/AC-6).
   *
   * @akili-spec changes/mass-reporting-flow
   */
  ratioOf(group: ReportingAowGroup): { done: number; total: number; percent: number } {
    const { done, total, percent } = buildRatio(this.ratioBase(group));
    return { done, total, percent };
  }

  /**
   * `title` for the header ratio when the zero-target rule (MRF-R-7) actually excluded KPIs from
   * its denominator — `''` renders no `title` attribute at all.
   *
   * @akili-spec changes/mass-reporting-flow
   */
  ratioTitle(group: ReportingAowGroup): string {
    const { zeroTarget } = buildRatio(this.ratioBase(group));
    return zeroTarget > 0 ? `excludes ${this.countLabel(zeroTarget, 'zero-target KPI')}` : '';
  }

  /**
   * The set both ratio readings count over. `__allIndicators` is a side-channel field the host adds
   * ONLY while Only-pending is on (`dashboard-lab.applyBurndownFilterAndSort`) — it is not on
   * `ReportingAowGroup`'s own interface, so it is read through a local cast rather than declared.
   *
   * @akili-spec changes/mass-reporting-flow
   */
  private ratioBase(group: ReportingAowGroup): ReportingIndicator[] {
    return (group as { __allIndicators?: ReportingIndicator[] }).__allIndicators ?? group.indicators ?? [];
  }

  countLabel(n: number, noun = 'KPI'): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
  }

  /**
   * Default disclosure, matching the design's own seed state:
   *
   * ```js
   * expandedAows: {},                       // every card starts COLLAPSED (68px header only)
   * expandedGroups: { …every group: true }  // every sub-group starts OPEN
   * ```
   *
   * So the page opens as a scannable list of card headers, and the moment a user expands one they
   * see its rows — not a second wall of collapsed group headers. Auto-opening the first AoW (the
   * previous behaviour) made the very first card the odd one out and pushed the rest below the fold.
   *
   * `expandAll()` is the only thing that lifts that seed: the toolbar's Expand all switch moves the
   * default for every card at once (P2-3252) instead of writing an override per AoW.
   */
  isDefaultOpenAow(): boolean {
    return this.expandAll();
  }

  isDefaultOpenHlo(): boolean {
    return true;
  }

  /**
   * Top-level cards with something to show. With NOTHING filtering, every card the parent built is
   * kept (including empty AoWs). Once any of the five toolbar controls is narrowing the list, empty
   * cards drop out so it does not fill with dead headers.
   */
  readonly visibleGroups = computed(() => {
    if (!this.filtersActive()) return this.groups();
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

  /**
   * Is the WHOLE visible list open right now? Read over the real per-card state (override first,
   * level default second), which is what makes the toolbar label honest even after the user opened
   * or closed cards one by one.
   *
   * Top-level cards only. A sub-group the user folded inside an open AoW does not turn the list
   * "not expanded": the card is still open, and the next press must therefore collapse.
   * An empty list is never "all open" — there would be nothing to collapse.
   */
  readonly allOpen = computed(() => {
    const groups = this.visibleGroups();
    if (!groups.length) return false;
    const defaultOpen = this.expandAll();
    return groups.every(group => this.isOpen(`aow::${group.aow.code}`, defaultOpen));
  });

  constructor() {
    // The host owns the toolbar, which sits ABOVE this table and cannot read into it — so the state
    // is pushed out. `allOpen` is a computed, so this only fires when the answer actually changes.
    effect(() => this.allOpenChange.emit(this.allOpen()));
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

  // ── All-indicators table ──────────────────────────────────────────────────
  private static readonly STATUS_RANK: Record<RowStatus, number> = {
    'not-started': 0,
    'in-progress': 1,
    achieved: 2,
    overachieved: 3
  };

  /** Numeric sort key for a figure. `-Infinity` = nothing reported, so those rows group together. */
  private sortNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || (value as unknown) === '') return Number.NEGATIVE_INFINITY;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }

  /**
   * The rows the `All indicators` table renders, decorated with sort keys.
   *
   * Built from `flatRows()` so BOTH views answer to exactly the same filtering — the flat list is a
   * different presentation of the same set, never a different query.
   */
  readonly flatTableRows = computed<ReportingFlatRow[]>(() =>
    this.flatRows().map(row => {
      const status = this.statusOf(row);
      const aow = this.aowCodeOf(row);
      return {
        ...row,
        __aowCode: aow ?? undefined,
        __sortTarget: this.sortNumber(row.target_value_sum),
        __sortAchieved: this.sortNumber(row.actual_achieved_value_sum),
        __sortStatus: ReportingAowTableComponent.STATUS_RANK[status],
        __statusKey: status,
        __statusText: this.statusLabel(row),
        // The `Type` column is the CATEGORY (`result_type_name`), which is what the Category filter
        // offers. The indicator NAME (`type_name`) stays on the title block's meta line, exactly as
        // in the grouped view — the two are different fields and the design shows both.
        __typeLabel: row.result_type_name?.trim() || '—',
        __centerLabel: row.center_acronym?.trim() || '—'
      };
    })
  );

  /** Fixed fg/bg pair for an indicator's progress pill. Never recombined across states (rule 9). */
  statusPillClass(status: RowStatus): string {
    switch (status) {
      case 'achieved':
        return 'bg-[var(--pr-indicator-achieved-bg)] text-[var(--pr-indicator-achieved-fg)]';
      case 'overachieved':
        return 'bg-[var(--pr-indicator-overachieved-bg)] text-[var(--pr-indicator-overachieved-fg)]';
      case 'in-progress':
        return 'bg-[var(--pr-status-in-progress-bg)] text-[var(--pr-status-in-progress-fg)]';
      default:
        return 'bg-[var(--pr-status-not-started-bg)] text-[var(--pr-status-not-started-fg)]';
    }
  }

  // ── Next pending (inherited from the By-AOW cards, MRF-R-3.1) ─────────────
  /** Transient marker for the row "Next pending" just jumped to — cleared after ~2.6s. */
  readonly highlightedRowKey = signal<string | null>(null);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  /** True for the ONE row whose report surface just closed — that row offers "Next pending". */
  isLastReportedRow(row: ReportingIndicator): boolean {
    const last = this.lastReported();
    return !!last && String(last.id) === String(row.indicator_id) && (last.aowCode ?? '') === (row.__aowCode ?? '');
  }

  /**
   * Every row the user can currently SEE, in display order — grouped mode walks the cards/bands
   * exactly as rendered, flat mode reuses `flatRows`. `nextPendingRow` walks this list, so "next"
   * always means "next on screen", honouring every active filter (same contract as the By-AOW
   * card's `orderedByAowIndicators`).
   */
  private orderedVisibleRows(): ReportingIndicator[] {
    if (this.viewMode() === 'flat') return this.flatRows();
    return this.visibleGroups().flatMap(g => this.hloGroupsOf(g).flatMap(h => h.rows));
  }

  /**
   * Next pending row after the last-reported one, wrapping once around the visible list; `null`
   * when nothing pending is left (the template renders the "all reported" note instead, mirroring
   * MRF-AC-3's BUT clause). Matched by id+AoW — indicator ids repeat across AoWs (MRF C-8).
   */
  readonly nextPendingRow = computed<ReportingIndicator | null>(() => {
    const last = this.lastReported();
    if (!last) return null;
    const rows = this.orderedVisibleRows();
    const total = rows.length;
    if (!total) return null;
    const isLast = (r: ReportingIndicator) =>
      String(r.indicator_id) === String(last.id) && (r.__aowCode ?? '') === (last.aowCode ?? '');
    const idx = rows.findIndex(isLast);
    const start = idx === -1 ? 0 : idx + 1;
    for (let offset = 0; offset < total; offset++) {
      const candidate = rows[(start + offset) % total];
      if (candidate && !isLast(candidate) && pendingOf([candidate]).length > 0) return candidate;
    }
    return null;
  });

  /**
   * Jump to the next pending row: open its card + sub-group if collapsed (rows are matched by
   * `rowKey`, never identity — the bucket bands clone their rows), then scroll + highlight, the
   * same affordance the `?kpi=` restore gives on the By-AOW cards.
   */
  goToNextPending(ev: Event): void {
    ev.stopPropagation();
    const target = this.nextPendingRow();
    if (!target) return;
    const targetKey = this.rowKey(target);
    if (this.viewMode() === 'grouped') {
      const group = this.visibleGroups().find(g => this.visibleRows(g).some(r => this.rowKey(r) === targetKey));
      if (group) {
        const aowKey = `aow::${group.aow.code}`;
        if (!this.isOpen(aowKey, this.isDefaultOpenAow())) this.toggle(aowKey, this.isDefaultOpenAow());
        const hlo = this.hloGroupsOf(group).find(h => h.rows.some(r => this.rowKey(r) === targetKey));
        if (hlo && !this.isOpen(hlo.key, this.isDefaultOpenHlo())) this.toggle(hlo.key, this.isDefaultOpenHlo());
      }
    }
    this.highlightedRowKey.set(targetKey);
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => {
      this.highlightTimer = null;
      this.highlightedRowKey.set(null);
    }, 2600);
    // Waits for the card's 280ms disclosure animation to FINISH before scrolling — firing earlier
    // scrolls to a position the expanding card is still pushing around (verified live: 60ms landed
    // off-viewport).
    setTimeout(() => {
      // `CSS.escape` guarded — jsdom (the unit harness) does not implement the CSS global.
      const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(targetKey) : targetKey.replace(/"/g, '\\"');
      const el = document.querySelector(`[data-row-key="${escaped}"]`);
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 320);
  }

  // ── Row overflow menu ─────────────────────────────────────────────────────
  /**
   * Which row's `⋯` menu is open, by row key. Exactly one at a time (hard UI rule 2: never a menu
   * on top of a menu).
   *
   * The menu used to be an `openRowMenu` output the host never bound, so the button was inert — it
   * looked like a control and did nothing (P2-3405). It is handled here instead, and its two live
   * items reuse the outputs the Target and Achieved cells already emit, so the menu opens no
   * surface of its own and there is no second code path to keep in step.
   */
  private readonly openMenuKey = signal<string | null>(null);

  rowKey(row: ReportingIndicator): string {
    return `${row.indicator_id}::${row.center_id ?? ''}::${row.__aowCode ?? ''}`;
  }

  isRowMenuOpen(row: ReportingIndicator): boolean {
    return this.openMenuKey() === this.rowKey(row);
  }

  toggleRowMenu(row: ReportingIndicator, ev: Event): void {
    ev.stopPropagation();
    const key = this.rowKey(row);
    this.openInfoKey.set(null);
    this.openMenuKey.update(current => (current === key ? null : key));
  }

  /** Run a menu item's action and close the menu, without letting the click open the row. */
  runFromMenu<T>(emitter: { emit: (v: T) => void }, value: T, ev: Event): void {
    ev.stopPropagation();
    this.openMenuKey.set(null);
    emitter.emit(value);
  }

  /**
   * `Copy link` is visible-but-disabled for Intermediate Outcomes / 2030 Outcomes rows — those
   * buckets have no owning AoW for `tocAow=` to resolve back to, so the host's `kpiLink()` returns
   * `''` for them (MRF review finding). Mirrors the `Copy indicator code` disabled pattern above.
   */
  canCopyLink(row: ReportingIndicator): boolean {
    return !COPY_LINK_UNSUPPORTED_AOW_CODES.has(row.__aowCode ?? '');
  }

  // ── Card info popover ─────────────────────────────────────────────────────
  /**
   * Which card's ⓘ popover is open, by group code.
   *
   * The ⓘ was a hover-only `prTooltip` whose content was `group.aow.name` — the string printed
   * immediately to its left, so the affordance promised information and delivered a repeat. The
   * design specifies a click-to-open popover with a title, a body and a meta footer.
   */
  private readonly openInfoKey = signal<string | null>(null);

  isInfoOpen(group: ReportingAowGroup): boolean {
    return this.openInfoKey() === group.aow.code;
  }

  toggleInfo(group: ReportingAowGroup, ev: Event): void {
    // The card header is itself a disclosure button, so this must not also expand the card.
    ev.stopPropagation();
    const key = group.aow.code;
    this.openMenuKey.set(null);
    this.openInfoKey.update(current => (current === key ? null : key));
  }

  /**
   * Footer line of the info popover. Everything here is derived from data already loaded — the KPI
   * total, and for a real Area of Work the output/outcome split. The DESCRIPTION is the part the
   * payload does not carry; the template marks that single field `Coming soon` rather than
   * inventing prose (and specifically rather than reusing another programme's blurb).
   */
  infoMeta(group: ReportingAowGroup): string {
    const total = (group.indicators ?? []).length;
    if (this.isBucket(group)) return this.countLabel(total);
    const outputs = (group.indicators ?? []).filter(r => r.__tier !== 'outcome').length;
    return `${this.countLabel(total)} · ${outputs} output${outputs === 1 ? '' : 's'} · ${total - outputs} outcome${
      total - outputs === 1 ? '' : 's'
    }`;
  }

  // ── Dismissal (hard UI rule 4: Escape closes) ─────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeOverlays();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeOverlays();
  }

  private closeOverlays(): void {
    if (this.openMenuKey() !== null) this.openMenuKey.set(null);
    if (this.openInfoKey() !== null) this.openInfoKey.set(null);
  }
}
