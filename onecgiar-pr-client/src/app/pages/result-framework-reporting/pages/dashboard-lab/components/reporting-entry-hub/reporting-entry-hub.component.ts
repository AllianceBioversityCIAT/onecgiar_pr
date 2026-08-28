// @akili-spec changes/reporting-entry-hub
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideChevronDown,
  lucideChevronUp,
  lucideInfo,
  lucidePlus,
  lucideSearch,
  lucideX
} from '@ng-icons/lucide';
import { HUB_COPY } from './hub-copy';

/** One row of the W1/W2 lane's Area-of-Work list (`overviewAowProgress()` shape). */
export interface HubAowRow {
  code: string;
  name: string;
  done: number;
  total: number;
}

export type HubProgramLevelKind = 'intermediate' | '2030';

/** One row of the W1/W2 lane's "Program-level · cross-cutting" group (`REH-R-2.1`). */
export interface HubProgramLevelRow {
  kind: HubProgramLevelKind;
  name: string;
  done: number;
  total: number;
}

/**
 * One W3 project item, shaped exactly like `BilateralProject` plus `allocation` (design §4.1
 * `REH-DD-4`) — this identity is what lets the host pass the item straight into
 * `BilateralCreationService.selectProject()` unchanged.
 */
export interface HubProject {
  id: number | string;
  shortName: string;
  fullName: string;
  summary?: string;
  description?: string;
  leadCenter?: unknown;
  sciencePrograms?: unknown[];
  allocation: number;
}

/** One of the signed-in user's centers, with the projects that allocate to this program. */
export interface HubCenterProjects {
  code: string;
  name: string;
  acronym?: string;
  /** M — the center's active projects in the active reporting year. */
  total: number;
  /** N — projects with an allocation to this program (`= projects.length`, cap notwithstanding). */
  matching: number;
  /** Server-side per-center lookup failure (`REH-R-4.6`) — `total`/`matching` are `0` in this case. */
  error?: boolean;
  projects: HubProject[];
}

/** `ReportingEntryHubProjectsDto` (design §4.1) — the whole W3 response payload. */
export interface HubW3Data {
  programCode: string;
  activeYear: number;
  truncated: boolean;
  centers: HubCenterProjects[];
}

export type HubW3Status = 'loading' | 'ready' | 'error' | 'no-centers';

export interface HubW3State {
  status: HubW3Status;
  data?: HubW3Data;
}

export interface HubCreateResultEvent {
  project: HubProject;
  center: HubCenterProjects;
}

const COLLAPSE_STORAGE_KEY = 'pr.hub.collapsed';

/**
 * "Where to report" hub — first section of the program Overview (`REH-R-1`). Two lanes built from
 * data the host (`DashboardLabComponent`) already computes: W1/W2 (Areas of Work + program-level
 * outcomes, no request) and W3 (the signed-in user's centers' bilateral projects, one request owned
 * by the host — `w3State`). This component owns only UI state: collapse, search, per-center
 * expand/show-all, and the `aria-live` announcement text.
 *
 * Visual reference: `docs/specs/changes/reporting-entry-hub/mockup/Main.dc.html` (Variant A).
 * Tokens/icons/responsive rules: `design.md` §6.3 — reused verbatim from `program-overview`, no new
 * hex values.
 *
 * ⚠️ `html` is 12px — arbitrary px values only (no rem-based Tailwind type utilities).
 */
@Component({
  selector: 'app-reporting-entry-hub',
  standalone: true,
  imports: [NgClass, RouterLink, NgIcon],
  templateUrl: './reporting-entry-hub.component.html',
  styleUrl: './reporting-entry-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ lucideArrowRight, lucideChevronDown, lucideChevronUp, lucideInfo, lucidePlus, lucideSearch, lucideX })
  ]
})
export class ReportingEntryHubComponent {
  readonly copy = HUB_COPY;

  readonly programCode = input<string>('');
  readonly phaseLabel = input<string>('');
  readonly isActivePhase = input<boolean>(true);
  readonly activeYear = input<number | null>(null);
  readonly aowRows = input<HubAowRow[]>([]);
  readonly programLevelRows = input<HubProgramLevelRow[]>([]);
  readonly canReportW1W2 = input<boolean>(true);
  readonly w3State = input<HubW3State>({ status: 'loading' });
  readonly myCentersCount = input<number>(0);

  readonly reportAow = output<string>();
  readonly reportProgramLevel = output<HubProgramLevelKind>();
  readonly createResult = output<HubCreateResultEvent>();
  readonly retryW3 = output<void>();
  readonly collapsedChange = output<boolean>();

  /** `null` = no explicit user choice yet (nothing stored) → falls back to `defaultCollapsed`. */
  private readonly userCollapsed = signal<boolean | null>(this.readStoredCollapsed());

  /** `REH-R-12`: collapsed by default for pure viewers (no reporting right AND no center). */
  private readonly defaultCollapsed = computed(() => !this.canReportW1W2() && this.myCentersCount() === 0);

  readonly collapsed = computed(() => this.userCollapsed() ?? this.defaultCollapsed());

  readonly searchQuery = signal('');
  private readonly manualExpanded = signal<ReadonlyMap<string, boolean>>(new Map());
  private readonly manualShowAll = signal<ReadonlyMap<string, boolean>>(new Map());

  /** `aria-live="polite"` announcement text (`REH-AC-14`). */
  readonly liveMessage = signal('');

  readonly w3Data = computed<HubW3Data | null>(() => this.w3State().data ?? null);

  readonly visibleCenters = computed(() => this.w3Data()?.centers ?? []);

  /** Lane header totals (`REH-R-3.6`) — sum of `N` (matching) across all centers. */
  readonly totalMatchingProjects = computed(() =>
    this.visibleCenters().reduce((sum, c) => sum + (c.matching || 0), 0)
  );

  readonly centersWithMatching = computed(() => this.visibleCenters().filter(c => c.matching > 0).length);

  /** `REH-R-4.2` / `REH-AC-7`: every center funds nothing here. */
  readonly noneFunding = computed(() => {
    const centers = this.visibleCenters();
    return centers.length > 0 && centers.every(c => c.matching === 0);
  });

  readonly isSearching = computed(() => this.searchQuery().trim().length > 0);

  /** Numerator of the search counter — matches across ALL centers (`REH-R-3.4`). */
  readonly filteredMatchCount = computed(() => {
    if (!this.isSearching()) return this.totalMatchingProjects();
    const query = this.normalizedQuery();
    return this.visibleCenters().reduce((sum, c) => sum + c.projects.filter(p => this.matchesQuery(p, query)).length, 0);
  });

  /** The first center (in server order — `matching` desc, name asc) with `N > 0` (`REH-R-3.1`). */
  private readonly firstFundingCenterCode = computed(() => this.visibleCenters().find(c => c.matching > 0)?.code ?? null);

  readonly collapsedSummary = computed(() =>
    this.copy.collapsedSummary(this.aowRows().length, this.totalMatchingProjects(), this.centersWithMatching())
  );

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.userCollapsed.set(next);
    this.persistCollapsed(next);
    this.collapsedChange.emit(next);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.liveMessage.set(this.copy.w3.searchAnnouncement(this.filteredMatchCount(), this.totalMatchingProjects()));
  }

  /** Projects matching the active search within one center — unfiltered (`= center.projects`) when idle. */
  matchingProjectsFor(center: HubCenterProjects): HubProject[] {
    if (!this.isSearching()) return center.projects;
    const query = this.normalizedQuery();
    return center.projects.filter(p => this.matchesQuery(p, query));
  }

  isCenterExpanded(center: HubCenterProjects): boolean {
    if (this.isSearching()) return this.matchingProjectsFor(center).length > 0;
    const explicit = this.manualExpanded().get(center.code);
    return explicit !== undefined ? explicit : center.code === this.firstFundingCenterCode();
  }

  toggleCenterExpanded(center: HubCenterProjects): void {
    const next = !this.isCenterExpanded(center);
    const map = new Map(this.manualExpanded());
    map.set(center.code, next);
    this.manualExpanded.set(map);
    // While a search is active, the actual expand/collapse display is driven by whether the
    // center has a match (`isCenterExpanded`'s search branch), not by this map — the toggle has
    // no visible effect, so announcing it would be misleading.
    if (!this.isSearching()) {
      this.liveMessage.set(this.copy.w3.centerToggleAnnouncement(center.name, next));
    }
  }

  isCenterShowAll(center: HubCenterProjects): boolean {
    if (this.isSearching()) return true;
    return this.manualShowAll().get(center.code) ?? false;
  }

  toggleShowAll(center: HubCenterProjects): void {
    const next = !this.isCenterShowAll(center);
    const map = new Map(this.manualShowAll());
    map.set(center.code, next);
    this.manualShowAll.set(map);
    this.liveMessage.set(this.copy.w3.showAllAnnouncement(next, center.matching, center.name));
  }

  /** The slice actually rendered — 3 rows unless `Show all` (or an active search) reveals the rest. */
  visibleProjectsFor(center: HubCenterProjects): HubProject[] {
    const projects = this.matchingProjectsFor(center);
    return this.isCenterShowAll(center) ? projects : projects.slice(0, 3);
  }

  percentOf(row: HubAowRow | HubProgramLevelRow): number {
    return row.total ? Math.round((row.done / row.total) * 100) : 0;
  }

  onReportAow(row: HubAowRow): void {
    if (!this.canReportW1W2()) return;
    this.reportAow.emit(row.code);
  }

  onReportProgramLevel(row: HubProgramLevelRow): void {
    if (!this.canReportW1W2()) return;
    this.reportProgramLevel.emit(row.kind);
  }

  onCreateResult(project: HubProject, center: HubCenterProjects): void {
    if (!center.acronym) return;
    this.createResult.emit({ project, center });
  }

  onRetry(): void {
    this.retryW3.emit();
  }

  requestAccessHref(): string {
    return `mailto:PRMSTechSupport@cgiar.org?subject=${encodeURIComponent(this.copy.requestAccessMailSubject)}`;
  }

  private normalizedQuery(): string {
    return this.searchQuery().trim().toLowerCase();
  }

  private matchesQuery(project: HubProject, query: string): boolean {
    return project.shortName.toLowerCase().includes(query) || project.fullName.toLowerCase().includes(query);
  }

  /** `REH-DD-5`: same `localStorage` convention as `FontScaleService`'s `pr.a11y.fontScale`. */
  private readStoredCollapsed(): boolean | null {
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return null;
    } catch {
      return null;
    }
  }

  private persistCollapsed(value: boolean): void {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(value));
    } catch {
      // Storage may be unavailable (private mode / blocked) — collapse still works for the session.
    }
  }
}
