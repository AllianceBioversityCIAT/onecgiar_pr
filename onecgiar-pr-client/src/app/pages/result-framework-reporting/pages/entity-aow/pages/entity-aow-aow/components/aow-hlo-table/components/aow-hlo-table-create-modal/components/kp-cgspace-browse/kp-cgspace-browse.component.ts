import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  untracked,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideFilter, lucideGlobe, lucideRefreshCw, lucideSplit, lucideTriangleAlert } from '@ng-icons/lucide';
import { catchError, debounceTime, defer, distinctUntilChanged, finalize, map, merge, of, retry, Subject, Subscription, switchMap, tap, timer } from 'rxjs';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { HlmBadge } from '@spartan/badge';
import { HlmTooltip } from '@spartan/tooltip';
import {
  ALL_KP_REPOSITORIES,
  KP_ITEM_HOSTS,
  KP_REPOSITORIES,
  KpRepository,
  KpRepositoryMeta,
  KpRepositoryStatus,
  kpRepositoryLabel
} from './kp-repositories.constants';

export interface CgspaceItemDto {
  uuid: string;
  handle: string;
  handleUrl: string;
  itemUrl: string;
  title: string;
  type: string;
  year: number | null;
  authors: string[];
  affiliations: string[];
  countries: string[];
  doi: string | null;
  uri: string;
  // @akili-spec changes/kp-multi-repository-browse — design §4.1 (additive)
  /** Repository the item came from; absent on legacy single-source responses. */
  repository?: KpRepository;
  // @akili-spec changes/kp-multi-repository-browse — design §4.1 / KPM-R-5 (additive)
  /** Secondary repositories collapsed into this card by dedup; empty/absent when no match. */
  alsoIn?: { repository: KpRepository; handle: string; handleUrl: string; itemUrl: string }[];
  // @akili-spec changes/kp-program-accelerator-match — KPAM-R-1 / KPAM-DD-3 (additive)
  /** Science Programs or Accelerators tagged on the item. */
  programAccelerators?: string[];
  // @akili-spec changes/kp-project-match — KPPJ-R-1 (additive)
  /** Project identifiers tagged on the item from cg.identifier.project. */
  projects?: string[];
  // @akili-spec changes/kp-related-relevance-ranking — KRR design §5 / §9 (additive)
  /** Subject keywords of the item (can be `[]`). */
  subjects?: string[];
  /** Ranked related items only: project factors the item satisfies and the resulting tier. */
  projectMatch?: KpProjectMatch;
}

// @akili-spec changes/kp-related-relevance-ranking — KRR design §5 (mirrors the server `CgspaceProjectMatchDto`)
export type KpProjectMatchTier = 'strong' | 'partial' | 'weak' | 'none';
export type KpProjectMatchFactor = 'keywords' | 'center' | 'program';

export interface KpProjectMatch {
  tier: KpProjectMatchTier;
  /** Fixed order: keywords, center, program. */
  factors: KpProjectMatchFactor[];
}

/** `projectScope` echo of a search response (`KPSF` design §7, `ranked` added by `KRR` design §5). */
export interface KpProjectScopeEcho {
  scope?: KpProjectScope;
  applied?: boolean;
  /** True when the related page carries the relevance block (ordered by relevance, items carry `projectMatch`). */
  ranked?: boolean;
  /** True only when the related-only filter form was applied on every repository (`KRS` design §5). */
  relatedOnly?: boolean;
}

/** @akili-spec changes/kp-project-match — KPPJ-DD-3 shared fuzzy normalization */
function expandCompactIdentifiers(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function normalizeMatchString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function compactMatchString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Repository metadata field Science Program highlight reads (KPAM). */
export const REPOSITORY_PROGRAM_METADATA_FIELD = 'cg.contributor.programAccelerator';

export interface KpBrowseActiveFilterDescriptor {
  key: string;
  label: string;
  detail: string;
  tone: 'locked' | 'active' | 'inactive' | 'neutral';
}

function matchesTaggedMetadata(
  tags: string[] | undefined,
  rawCode: string,
  rawName: string
): boolean {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return false;
  }

  const code = expandCompactIdentifiers(rawCode.trim());
  const name = expandCompactIdentifiers(rawName.trim());
  if (!code && !name) {
    return false;
  }

  const normCode = normalizeMatchString(code);
  const compactCode = compactMatchString(code);
  const normName = normalizeMatchString(name);
  const compactName = compactMatchString(name);

  return tags.some(tag => {
    if (!tag || typeof tag !== 'string') return false;

    const normTag = normalizeMatchString(tag);
    const compactTag = compactMatchString(tag);
    if (!normTag && !compactTag) return false;

    if (compactCode) {
      if (compactTag === compactCode || normTag === normCode) return true;
      const tokens = normTag.split(' ');
      if (tokens.includes(normCode) || tokens.includes(compactCode)) return true;
      if (compactTag.startsWith(compactCode) || compactTag.includes(compactCode)) return true;
    }

    if (compactName && compactName.length >= 3) {
      if (compactTag === compactName || normTag === normName) return true;
      if (normTag.includes(normName) || compactTag.includes(compactName)) return true;
      if (compactTag.length >= 3 && (normName.includes(normTag) || compactName.includes(compactTag))) {
        return true;
      }
    }

    return false;
  });
}

// @akili-spec changes/kp-multi-repository-browse — design §4.1
/** Per-repository outcome of one fan-out search (`sources[]` in the response body). */
export interface SourceStatusDto {
  repository: KpRepository;
  status: KpRepositoryStatus;
  total: number;
  hasMore: boolean;
}

// @akili-spec changes/kp-multi-repository-browse — KPM-DD-8
/** View model of one source-strip chip (`KPM-R-1`, `KPM-R-2`, `KPM-R-6`). */
export interface KpRepositoryChip {
  key: KpRepository;
  label: string;
  /** `aria-pressed` — the repository is part of the current search. */
  selected: boolean;
  /** `aria-disabled` — the only repository left; toggling it is a no-op (`KPM-R-2`). */
  disabled: boolean;
  /** The source answered with `timeout | error | unconfigured` (`KPM-R-6`). */
  unavailable: boolean;
  /** Status of the last response for this repository, `null` before any search. */
  status: KpRepositoryStatus | null;
  /** Count badge text: the source total, `'unavailable'`, or `null` before a search. */
  countLabel: string | null;
  /** Tooltip — the disabled reason, else the unavailable reason, else no attribute. */
  title: string | null;
}

/** `KPM-R-2` — accessible reason why the last selected chip cannot be turned off. */
export const KP_LAST_REPOSITORY_TITLE = 'At least one repository must stay selected';

/** Lifecycle of one result list (the related list and, in the project-scoped browse, the linked list). */
export type KpBrowseStatus = 'idle' | 'loading' | 'empty' | 'error' | 'results';

/** `projectScope` request value and response echo (`KPSF` design §7). */
export type KpProjectScope = 'linked' | 'related';

// @akili-spec changes/kp-project-strict-filter — KPSF-R-3 / R-5 / R-11 / R-12: copy of the two-section browse
export const KP_BROWSE_COPY = {
  linkedHeading: 'KPs linked to the project',
  relatedHeading: 'Other KPs potentially related',
  linkedInfo: "Linked KPs are repository items whose project field contains this project's title words or PJ code.",
  proxyNote:
    'These KPs are not tagged with this project in the repository, so the relation is approximate. They are not ranked by how closely they relate to the project: without search text they are listed newest first; with search text, by how well they match it.',
  // @akili-spec changes/kp-related-relevance-ranking — KRR-R-7 / KRR-R-8 / design §8
  // @akili-spec changes/kp-related-strongest-first — KRS-R-5 / design §8: ranked note (strongest first + toggle) and toggle copy
  proxyNoteRanked:
    'These KPs are not tagged with this project in the repository. The strongest matches are shown first on each page; turn on "Only related KPs" to hide KPs with no matching subject, Center or Science Program. The match label is an approximation.',
  relatedOnlyLabel: 'Only related KPs',
  relatedOnlyUnavailable: 'Not available for this search',
  proxyMarker: 'Proxy',
  proxyMarkerTooltip: 'Proxy: this KP is not tagged with this project in the repository. Its relation to the project is approximate — see the match label.',
  tierStrong: 'Strong match',
  tierPartial: 'Partial match',
  tierWeak: 'Weak match',
  tierNone: 'No direct match',
  // @akili-spec changes/kp-related-strongest-first — KRS-R-4: factor count suffix, `{n}` = matched factors out of 3
  tierCount: '{n} of 3',
  tierTooltip: 'Approximate: based on matching subjects, Center and Science Program with this project. Not tagged with the project.',
  factorKeywords: 'Project keywords',
  factorCenter: 'Center',
  factorProgram: 'Science Program',
  linkedEmptyTitle: 'No linked KPs',
  relatedEmptyTitle: 'No other KPs found for this search',
  linkedNotApplied: 'This project has no title words or PJ code the repositories can be matched on, so no linked KPs can be listed. See the potentially related KPs below.',
  linkedLoading: 'Searching KPs linked to the project…',
  relatedLoading: 'Searching potentially related KPs…',
  sectionError: 'This list is temporarily unavailable.',
  minChars: 'Please enter at least 3 characters to search the selected repositories.',
  minCharsClear: 'Clear the text to see the KPs linked to this project.',
  scopedIdle: 'Search CGSpace, MELSpace and WorldFish by title, author, or DOI.'
} as const;

export interface FacetOption {
  label: string;
  value: string;
}

export interface YearOption {
  label: string;
  value: number;
}

export const DEFAULT_CGSPACE_TYPES: FacetOption[] = [
  { label: 'Journal Article', value: 'Journal Article' },
  { label: 'Report', value: 'Report' },
  { label: 'Book', value: 'Book' },
  { label: 'Book Chapter', value: 'Book Chapter' },
  { label: 'Working Paper', value: 'Working Paper' },
  { label: 'Policy Brief', value: 'Policy Brief' },
  { label: 'Brief', value: 'Brief' },
  { label: 'Brochure', value: 'Brochure' },
  { label: 'Newsletter', value: 'Newsletter' },
  { label: 'Manual', value: 'Manual' },
  { label: 'Training Material', value: 'Training Material' },
  { label: 'Data Paper', value: 'Data Paper' },
  { label: 'Dataset', value: 'Dataset' },
  { label: 'Poster', value: 'Poster' },
  { label: 'Presentation', value: 'Presentation' },
  { label: 'Preprint', value: 'Preprint' },
  { label: 'Other', value: 'Other' }
];

export const CGIAR_CENTER_ACRONYMS: Record<string, string> = {
  'Africa Rice Center': 'AfricaRice',
  'Alliance of Bioversity International and CIAT': 'Alliance',
  'Alliance of Bioversity and CIAT': 'Alliance',
  'Bioversity International': 'Bioversity',
  'Center for International Forestry Research': 'CIFOR',
  'International Center for Agricultural Research in the Dry Areas': 'ICARDA',
  'International Center for Tropical Agriculture': 'CIAT',
  'International Crops Research Institute for the Semi-Arid Tropics': 'ICRISAT',
  'International Food Policy Research Institute': 'IFPRI',
  'International Institute of Tropical Agriculture': 'IITA',
  'International Livestock Research Institute': 'ILRI',
  'International Maize and Wheat Improvement Center': 'CIMMYT',
  'International Potato Center': 'CIP',
  'International Rice Research Institute': 'IRRI',
  'International Water Management Institute': 'IWMI',
  'World Agroforestry': 'ICRAF',
  'World Agroforestry Centre': 'ICRAF',
  'WorldFish': 'WorldFish',
  'System Office': 'SO'
};

/**
 * Full center name for an acronym, through the name↔acronym map above (`KRR` design §6).
 * `undefined` when the acronym is empty or unknown; ties (e.g. two `ICRAF` names) resolve to the first entry.
 */
export function centerNameFromAcronym(acronym: string | null | undefined): string | undefined {
  const wanted = (acronym ?? '').trim().toUpperCase();
  if (!wanted) return undefined;
  return Object.entries(CGIAR_CENTER_ACRONYMS).find(([, value]) => value.toUpperCase() === wanted)?.[0];
}

export function formatCenterLabel(rawName: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();

  // 1. Direct match in dictionary
  const exactAcronym = CGIAR_CENTER_ACRONYMS[trimmed];
  if (exactAcronym) {
    if (trimmed.startsWith(exactAcronym)) {
      return trimmed;
    }
    return `${exactAcronym} - ${trimmed}`;
  }

  // 2. Case-insensitive dictionary match
  const lower = trimmed.toLowerCase();
  for (const [fullName, acronym] of Object.entries(CGIAR_CENTER_ACRONYMS)) {
    if (lower === fullName.toLowerCase()) {
      if (trimmed.startsWith(acronym)) {
        return trimmed;
      }
      return `${acronym} - ${trimmed}`;
    }
  }

  // 3. If trimmed already has "ACRONYM - Name" format
  for (const acronym of Object.values(CGIAR_CENTER_ACRONYMS)) {
    if (trimmed.startsWith(`${acronym} - `) || trimmed.startsWith(`${acronym} (`)) {
      return trimmed;
    }
  }

  // 4. If the string is already just an acronym (e.g. 'CIAT', 'CIP', 'ICRAF', 'IRRI')
  for (const [fullName, acronym] of Object.entries(CGIAR_CENTER_ACRONYMS)) {
    if (trimmed.toUpperCase() === acronym.toUpperCase()) {
      return `${acronym} - ${fullName}`;
    }
  }

  // 5. Parentheses format: "Name (ACRONYM)" -> "ACRONYM - Name"
  const parenMatch = trimmed.match(/^(.+?)\s*\(([A-Za-z0-9\s/-]{2,12})\)$/);
  if (parenMatch) {
    const namePart = parenMatch[1].trim();
    const acronymPart = parenMatch[2].trim();
    return `${acronymPart} - ${namePart}`;
  }

  return trimmed;
}

export const DEFAULT_CGSPACE_CENTERS: FacetOption[] = [
  { label: 'AfricaRice - Africa Rice Center', value: 'Africa Rice Center' },
  { label: 'Alliance - Alliance of Bioversity International and CIAT', value: 'Alliance of Bioversity International and CIAT' },
  { label: 'Bioversity - Bioversity International', value: 'Bioversity International' },
  { label: 'CIFOR - Center for International Forestry Research', value: 'Center for International Forestry Research' },
  { label: 'ICARDA - International Center for Agricultural Research in the Dry Areas', value: 'International Center for Agricultural Research in the Dry Areas' },
  { label: 'CIAT - International Center for Tropical Agriculture', value: 'International Center for Tropical Agriculture' },
  { label: 'ICRISAT - International Crops Research Institute for the Semi-Arid Tropics', value: 'International Crops Research Institute for the Semi-Arid Tropics' },
  { label: 'IFPRI - International Food Policy Research Institute', value: 'International Food Policy Research Institute' },
  { label: 'IITA - International Institute of Tropical Agriculture', value: 'International Institute of Tropical Agriculture' },
  { label: 'ILRI - International Livestock Research Institute', value: 'International Livestock Research Institute' },
  { label: 'CIMMYT - International Maize and Wheat Improvement Center', value: 'International Maize and Wheat Improvement Center' },
  { label: 'CIP - International Potato Center', value: 'International Potato Center' },
  { label: 'IRRI - International Rice Research Institute', value: 'International Rice Research Institute' },
  { label: 'IWMI - International Water Management Institute', value: 'International Water Management Institute' },
  { label: 'ICRAF - World Agroforestry', value: 'World Agroforestry' },
  { label: 'WorldFish', value: 'WorldFish' }
];

@Component({
  selector: 'app-kp-cgspace-browse',
  imports: [CommonModule, FormsModule, CustomFieldsModule, NgIcon, HlmBadge, HlmTooltip],
  templateUrl: './kp-cgspace-browse.component.html',
  styleUrls: ['./kp-cgspace-browse.component.scss'],
  // Client guide rule 21: every new icon in this component comes from @ng-icons/lucide.
  providers: [provideIcons({ lucideCircleCheck, lucideFilter, lucideGlobe, lucideRefreshCw, lucideSplit, lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpCgspaceBrowseComponent implements OnInit, OnDestroy {
  readonly resultsApiSE = inject(ResultsApiService);

  // @akili-spec changes/kp-cgspace-search-retry
  /** KCSR-DD-1: one initial call + two re-subscriptions = three total HTTP calls. */
  static readonly RETRY_COUNT = 2;
  /** KCSR-DD-2: production delay between retry attempts (ms). Override in tests. */
  retryDelayMs = 600;

  // Inputs
  readonly busy = input<boolean>(false);
  /** When false, the parent paints the full-pane overlay (e.g. indicator drawer) — keep busy for disables only. */
  readonly showBusyOverlay = input<boolean>(true);
  readonly phaseYear = input<number>(new Date().getFullYear());
  readonly isAdmin = input<boolean>(false);
  // @akili-spec changes/kp-program-accelerator-match — KPAM-R-2
  readonly programCode = input<string>('');
  readonly programName = input<string>('');
  // @akili-spec changes/kp-project-match — KPPJ-R-3
  readonly projectCode = input<string>('');
  readonly projectTitle = input<string>('');
  /**
   * Kept so existing bilateral consumers still compile; the browse no longer reads them
   * (the project fuzzy matcher was removed, `KPSF-DD-5`).
   */
  readonly projectSummary = input<string>('');
  readonly projectDescription = input<string>('');
  /** Bilateral-only; sent as `projectLeadCenter` (excluded server-side from the distinctive words). */
  readonly leadCenterAcronym = input<string>('');
  /**
   * Bilateral/W3 only — turns on the project-scoped (linked / related) browse.
   * Input name kept for the existing bilateral bindings; it no longer shows a facet chip.
   */
  readonly enableProjectRepositoryFilter = input<boolean>(false);

  // Outputs
  readonly itemSelected = output<CgspaceItemDto>();
  readonly switchToManual = output<void>();

  // State Signals
  readonly query = signal<string>('');
  readonly selectedType = signal<string | null>(null);
  readonly selectedCenter = signal<string | null>(null);
  readonly selectedYear = signal<number | string | null>(null);
  // @akili-spec changes/kp-program-accelerator-match — KPAM-R-7 / KPAM-DD-4
  readonly onlyMatches = signal<boolean>(false);
  // @akili-spec changes/kp-project-strict-filter — KPSF-DD-4: `items` / `total` / `page` / `status` / `hasMore` /
  // `sources` are the RELATED (unconstrained, minus linked) list in the project-scoped browse, and the single
  // list everywhere else. The linked-scope state below is only ever filled in the project-scoped browse.
  readonly items = signal<CgspaceItemDto[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(0);
  readonly status = signal<KpBrowseStatus>('idle');
  readonly loadingMore = signal<boolean>(false);
  // @akili-spec changes/kp-project-strict-filter — design §9 client state (linked scope)
  /** Section 1: items tagged with the project (`projectScope=linked`). */
  readonly linkedItems = signal<CgspaceItemDto[]>([]);
  readonly linkedTotal = signal<number>(0);
  readonly linkedPage = signal<number>(0);
  readonly linkedHasMore = signal<boolean>(false);
  readonly linkedStatus = signal<KpBrowseStatus>('idle');
  readonly linkedLoadingMore = signal<boolean>(false);
  /** `projectScope.applied` of the last linked response; `false` = the project is not usable server-side (KPSF-R-9). */
  readonly linkedApplied = signal<boolean>(true);
  /** `sources[]` of the last linked response (KPM-R-6 per scope). */
  readonly linkedSources = signal<SourceStatusDto[]>([]);
  // @akili-spec changes/kp-related-relevance-ranking — KRR-R-8
  /** `projectScope.ranked` of the last related response: true = ordered by relevance, so the ranked proxy note applies. */
  readonly relatedRanked = signal<boolean>(false);
  // @akili-spec changes/kp-related-strongest-first — KRS-R-2 / R-3 / DD-5: "Only related KPs" toggle, default off, never persisted
  /** The "Only related KPs" toggle. Resets wherever `relatedRanked` resets, and on project / context / year change. */
  readonly relatedOnly = signal<boolean>(false);
  /** `projectScope.relatedOnly` of the last related response; `undefined` until the answer to the current toggle state arrives. */
  readonly relatedOnlyEcho = signal<boolean | undefined>(undefined);
  /** Toggle on but the server did not apply the filter: the toggle is disabled and the count is not presented as filtered. */
  readonly relatedOnlyUnavailable = computed(() => this.relatedOnly() && this.relatedOnlyEcho() === false);
  // @akili-spec changes/kp-multi-repository-browse — KPM-R-20
  /** `page.hasMore` of the last response; drives *Load more* visibility (never `items().length < total()`). */
  readonly hasMore = signal<boolean>(false);
  /** Repository label of the item currently being retrieved, for the busy overlay (`design.md` §6.2). */
  readonly selectingRepositoryLabel = signal<string | null>(null);

  // @akili-spec changes/kp-multi-repository-browse — KPM-R-1 / KPM-R-2 / KPM-R-6
  /** Every repository, in merge priority order — the strip renders one chip per entry. */
  readonly allRepositories = ALL_KP_REPOSITORIES;
  /** Repositories included in the next search. Init = all three (`KPM-R-1`, `KPM-AC-1`). */
  readonly selectedRepositories = signal<KpRepository[]>([...ALL_KP_REPOSITORIES]);
  /** `sources[]` of the last search response; empty before the first one (`KPM-R-6`). */
  readonly sources = signal<SourceStatusDto[]>([]);

  readonly typeOptions = signal<FacetOption[]>(DEFAULT_CGSPACE_TYPES);
  readonly centerOptions = signal<FacetOption[]>(DEFAULT_CGSPACE_CENTERS);
  readonly loadingTypes = signal<boolean>(false);
  readonly loadingCenters = signal<boolean>(false);

  readonly adminYearOptions = computed<YearOption[]>(() => {
    const current = this.phaseYear();
    const options: YearOption[] = [];
    for (let y = current; y >= current - 10; y--) {
      options.push({ label: String(y), value: y });
    }
    return options;
  });

  // @akili-spec changes/kp-multi-repository-browse — KPM-DD-8
  /** One view model per chip: selection, count, unavailable state and the last-chip lock. */
  readonly repositoryChips = computed<KpRepositoryChip[]>(() => {
    const selected = this.selectedRepositories();
    const sources = this.sources();
    // KPSF-R-4: in the two-scope browse a repository is unavailable if it failed in EITHER scope,
    // and its count is linked + related (the related list already excludes the linked items).
    const linkedSources = this.isProjectScoped() ? this.linkedSources() : [];
    const isLastSelected = selected.length === 1;

    return this.allRepositories.map(key => {
      const meta = KP_REPOSITORIES[key];
      const isSelected = selected.includes(key);
      const answers = isSelected
        ? [sources.find(s => s.repository === key), linkedSources.find(s => s.repository === key)].filter((s): s is SourceStatusDto => !!s)
        : [];
      const status = (answers.find(s => s.status !== 'ok') ?? answers[0])?.status ?? null;
      // KPM-R-6: a failed source reads "unavailable", never "0".
      const unavailable = status !== null && status !== 'ok';
      const disabled = isSelected && isLastSelected;

      let countLabel: string | null = null;
      if (unavailable) {
        countLabel = 'unavailable';
      } else if (status === 'ok') {
        countLabel = String(answers.reduce((sum, s) => sum + (s.total ?? 0), 0));
      }

      let title: string | null = null;
      if (disabled) {
        title = KP_LAST_REPOSITORY_TITLE;
      } else if (unavailable) {
        title = this.unavailableReason(meta.label, status as KpRepositoryStatus);
      }

      return { key, label: meta.label, selected: isSelected, disabled, unavailable, status, countLabel, title };
    });
  });

  /** KPM-R-6: the tooltip names the state without leaking hosts or env vars (`AC-9`). */
  private unavailableReason(label: string, status: KpRepositoryStatus): string {
    switch (status) {
      case 'timeout':
        return `${label} did not respond in time. Results below exclude it.`;
      case 'unconfigured':
        return `${label} is not available right now. Results below exclude it.`;
      default:
        return `${label} returned an error. Results below exclude it.`;
    }
  }

  // @akili-spec changes/kp-multi-repository-browse — KPM-R-7 / KPM-R-23
  /** `kpRepositoryLabel` exposed as a bound method so the template can call it directly. */
  readonly kpRepositoryLabel = kpRepositoryLabel;

  /** Display metadata (badge/dot classes, label) for one repository key, `undefined` when absent. */
  repoMeta(key?: KpRepository | string | null): KpRepositoryMeta | undefined {
    return key ? KP_REPOSITORIES[key as KpRepository] : undefined;
  }

  /** Selected repositories whose last response failed (`timeout | error | unconfigured`), KPM-R-7. */
  readonly failedSources = computed<SourceStatusDto[]>(() => {
    const selected = this.selectedRepositories();
    const failed = this.sources().filter(source => selected.includes(source.repository) && source.status !== 'ok');
    // KPSF design §10: each scope keeps its own `sources[]`; a repository failing in either one is unavailable.
    for (const source of this.linkedSources()) {
      if (selected.includes(source.repository) && source.status !== 'ok' && !failed.some(f => f.repository === source.repository)) {
        failed.push(source);
      }
    }
    return failed;
  });

  /** `<Repo> a · <Repo> b …` over the selected repositories that answered `ok` (`KPM-R-4`). */
  private readonly answeredSourcesText = computed<string>(() => {
    const selected = this.selectedRepositories();
    return this.sources()
      .filter(source => selected.includes(source.repository) && source.status === 'ok')
      .map(source => `${kpRepositoryLabel(source.repository)} ${source.total}`)
      .join(' · ');
  });

  /** `Showing N of M items · <Repo> a · <Repo> b …` — the exact counter copy (`KPM-R-4`, `KPM-R-11`). */
  readonly resultsCounterText = computed<string>(() => {
    const base = `Showing ${this.items().length} of ${this.total()} items`;
    const answered = this.answeredSourcesText();
    return answered ? `${base} · ${answered}` : base;
  });

  // @akili-spec changes/kp-program-accelerator-match — KPAM-R-3 / Gate D2
  matchesProgram(item: CgspaceItemDto): boolean {
    return matchesTaggedMetadata(
      item?.programAccelerators,
      this.programCode() ?? '',
      this.programName() ?? ''
    );
  }

  /** The bilateral project has something the server can scope by (KPSF-R-9: `projectScope` needs a code or a title). */
  readonly hasProjectContext = computed(() => !!(this.projectCode()?.trim() || this.projectTitle()?.trim()));

  readonly hasProgramContext = computed(
    () => !!(this.programCode()?.trim() || this.programName()?.trim())
  );

  /** Short project label for the linked badge (T-4): the code, else the title. */
  readonly projectMatchLabel = computed(
    () => this.projectCode()?.trim() || this.projectTitle()?.trim() || ''
  );

  /** Bilateral manual-create drawer only — Programme Results browse leaves this false. */
  /** Full project name for the empty-linked state (KPSF-R-5): code · title. */
  readonly projectDisplayLabel = computed(() => [this.projectCode()?.trim(), this.projectTitle()?.trim()].filter(Boolean).join(' · '));

  /** Copy constants for the template. */
  readonly copy = KP_BROWSE_COPY;

  // @akili-spec changes/kp-related-relevance-ranking — KRR-R-7 / design §8
  /** Tier label of a related item (never a percentage); `null` when the item carries no `projectMatch`. */
  matchTierLabel(item: CgspaceItemDto): string | null {
    // @akili-spec changes/kp-related-strongest-first — KRS-R-4: `<label> · <n> of 3`; "No direct match" has no count
    const count = (): string => this.copy.tierCount.replace('{n}', String(item?.projectMatch?.factors?.length ?? 0));
    switch (item?.projectMatch?.tier) {
      case 'strong':
        return `${this.copy.tierStrong} · ${count()}`;
      case 'partial':
        return `${this.copy.tierPartial} · ${count()}`;
      case 'weak':
        return `${this.copy.tierWeak} · ${count()}`;
      case 'none':
        return this.copy.tierNone;
      default:
        return null;
    }
  }

  /** `Project keywords · Center · Science Program` — only the matched factors, fixed order; `''` for `none` or no match data. */
  matchFactorsLine(item: CgspaceItemDto): string {
    const factors = item?.projectMatch?.factors ?? [];
    const labels: [KpProjectMatchFactor, string][] = [
      ['keywords', this.copy.factorKeywords],
      ['center', this.copy.factorCenter],
      ['program', this.copy.factorProgram]
    ];
    return labels
      .filter(([factor]) => factors.includes(factor))
      .map(([, label]) => label)
      .join(' · ');
  }

  readonly isBilateralBrowse = computed(() => this.enableProjectRepositoryFilter());

  // @akili-spec changes/kp-project-strict-filter — KPSF-R-3 / KPSF-R-10
  /**
   * Two-scope (linked + related) browse. Needs the bilateral context AND a usable project:
   * a `projectScope` without code or title is a 400 server-side. Everything else is a single list
   * that sends no project parameter (KPSF-R-10).
   */
  readonly isProjectScoped = computed(() => this.isBilateralBrowse() && this.hasProjectContext());

  readonly activeFilterDescriptors = computed<KpBrowseActiveFilterDescriptor[]>(() => {
    const filters: KpBrowseActiveFilterDescriptor[] = [];
    const queryText = (this.query() || '').trim();

    if (queryText) {
      filters.push({ key: 'query', label: 'Search text', detail: queryText, tone: 'active' });
    }

    if (this.selectedType()) {
      filters.push({
        key: 'type',
        label: 'Item type',
        detail: String(this.selectedType()),
        tone: 'active'
      });
    }

    if (this.selectedCenter()) {
      filters.push({
        key: 'center',
        label: 'Center',
        detail: String(this.selectedCenter()),
        tone: 'active'
      });
    }

    if (this.isAdmin() && this.selectedYear() !== null && this.selectedYear() !== this.phaseYear()) {
      filters.push({
        key: 'year',
        label: 'Year',
        detail: String(this.selectedYear()),
        tone: 'active'
      });
    } else {
      filters.push({
        key: 'reporting-year',
        label: 'Reporting year',
        detail: `${this.phaseYear()} (reporting cycle)`,
        tone: 'locked'
      });
    }

    if (!this.isBilateralBrowse()) {
      return filters;
    }

    if (this.hasProjectContext()) {
      const code = this.projectCode()?.trim() ?? '';
      const title = this.projectTitle()?.trim() ?? '';
      const contextDetail = [code, title].filter(Boolean).join(' · ');
      filters.push({
        key: 'project-scope',
        label: 'Project',
        detail: `${contextDetail} — KPs tagged with this project are listed first; other KPs follow separately as potentially related (proxy)`,
        tone: 'neutral'
      });
    }

    if (this.hasProgramContext()) {
      const programDetail = [this.programCode()?.trim(), this.programName()?.trim()].filter(Boolean).join(' · ');
      filters.push({
        key: 'program-highlight',
        label: 'Science Program highlight',
        detail: programDetail,
        tone: 'neutral'
      });
    }

    return filters;
  });

  readonly emptyStateHints = computed<string[]>(() => {
    const hints: string[] = [];

    if (this.failedSources().length) {
      hints.push(
        `${this.failedRepositoriesText()} did not respond. Results may be incomplete — use Try again on the repository chip or switch to Manual entry.`
      );
    }

    if (!this.isAdmin()) {
      hints.push(`Reporting year ${this.phaseYear()} is always applied for bilateral results.`);
    }

    const queryText = (this.query() || '').trim();
    if (queryText) {
      hints.push(`Try different search terms than "${queryText}", or use Manual entry with a repository handle.`);
    } else {
      hints.push('Try search terms from the project title, or use Manual entry with a repository handle.');
    }

    return hints;
  });

  // @akili-spec changes/kp-program-accelerator-match — KPAM-R-7
  readonly matchCount = computed<number>(() => {
    if (!this.hasProgramContext()) {
      return 0;
    }
    // KPSF design §9: the SP match counts over both lists (the linked list is empty outside the project-scoped browse).
    return [...this.items(), ...this.linkedItems()].filter(item => this.matchesProgram(item)).length;
  });

  // @akili-spec changes/kp-program-accelerator-match — KPAM-R-5 / KPAM-R-6 / KPAM-DD-1
  // @akili-spec changes/kp-project-strict-filter — design §9: SP soft-sort and "matches only" stay SP-only, within each list
  /** SP matches first (order preserved), or only the SP matches when "Show matches only" is on. */
  private applyProgramMatch(raw: CgspaceItemDto[]): CgspaceItemDto[] {
    if (this.onlyMatches()) {
      return raw.filter(item => this.matchesProgram(item));
    }
    const matches: CgspaceItemDto[] = [];
    const others: CgspaceItemDto[] = [];
    for (const item of raw) {
      (this.matchesProgram(item) ? matches : others).push(item);
    }
    return matches.length === 0 ? raw : [...matches, ...others];
  }

  /** Related list (and the single list outside the project-scoped browse). */
  // @akili-spec changes/kp-related-strongest-first — KRS-R-1 / DD-2: a ranked related list keeps the server/tier order (no SP-first reorder)
  readonly displayItems = computed<CgspaceItemDto[]>(() => {
    if (this.relatedRanked()) {
      return this.onlyMatches() ? this.items().filter(item => this.matchesProgram(item)) : this.items();
    }
    return this.applyProgramMatch(this.items());
  });

  /** Linked list (section 1 of the project-scoped browse). */
  readonly displayLinkedItems = computed<CgspaceItemDto[]>(() => this.applyProgramMatch(this.linkedItems()));

  /** Natural-language join ("A", "A and B", "A, B and C") for the error/empty copy (`KPM-R-7`, `KPM-R-11`). */
  private formatRepositoryList(labels: string[]): string {
    if (labels.length === 0) return '';
    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  }

  /** All currently selected repositories, named — the error state MUST name them (`KPM-R-7`, `KPM-AC-8`). */
  readonly selectedRepositoriesText = computed<string>(() =>
    this.formatRepositoryList(this.selectedRepositories().map(key => kpRepositoryLabel(key)))
  );

  /** The failed repositories, named — the partial notice MUST name them, never a CSS class alone (`KPM-R-7`). */
  readonly failedRepositoriesText = computed<string>(() =>
    this.formatRepositoryList(this.failedSources().map(source => kpRepositoryLabel(source.repository)))
  );

  /** Design §7 / §6.2 / `KPM-DD-10`: View details may only open these four exact hosts. */
  readonly ALLOWED_HOSTS: readonly string[] = KP_ITEM_HOSTS;

  /** Minimum free-text length before a query is sent upstream (R-2, AC-8). */
  readonly MIN_QUERY_LENGTH = 3;

  /** `scope`: `all` = a reset (both lists in the project-scoped browse); `linked` / `related` = one list's *Load more*. */
  private readonly searchTrigger$ = new Subject<{
    page: number;
    append: boolean;
    immediate: boolean;
    scope: KpProjectScope | 'all';
  }>();
  private searchSubscription?: Subscription;

  /** Center prefix type-ahead (design §4.1): debounced facet reload with `prefix`. */
  readonly centerSearch = signal<string>('');
  readonly selectingItem = signal<string | null>(null);
  private readonly centerPrefix$ = new Subject<string>();
  private centerPrefixSubscription?: Subscription;

  // @akili-spec changes/kp-multi-repository-browse — design §6.2
  /** Repository-selection changes reload the facet unions under the same 400 ms debounce. */
  private readonly facetReload$ = new Subject<string>();
  private facetReloadSubscription?: Subscription;

  constructor() {
    // @akili-spec changes/kp-related-strongest-first — KRS-R-2: a project or context change drops the ranked state and the toggle
    let lastProjectKey: string | undefined;
    effect(() => {
      const key = [this.isBilateralBrowse(), this.projectCode(), this.projectTitle()].join('|');
      // First run only records the key: it must not wipe a response that already arrived.
      if (lastProjectKey !== undefined && key !== lastProjectKey) {
        untracked(() => this.resetRelatedRanking());
      }
      lastProjectKey = key;
    });
    effect(() => {
      if (!this.busy()) {
        this.selectingItem.set(null);
        this.selectingRepositoryLabel.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.selectedYear.set(this.phaseYear());
    this.loadFacets();
    this.initCenterTypeAhead();
    this.initFacetReloadPipeline();
    this.initSearchPipeline();

    // @akili-spec changes/kp-project-strict-filter — KPSF-R-13: the linked KPs show on open, no text or type needed.
    if (this.isProjectScoped() && this.canSearch()) {
      this.runSearch(0, false);
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.centerPrefixSubscription?.unsubscribe();
    this.facetReloadSubscription?.unsubscribe();
  }

  private mapFacetValues(res: any): FacetOption[] {
    const raw = res?.response?.values ?? res?.response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => ({
      label: v.label || v.value || v.name || String(v),
      value: v.value || v.name || String(v)
    }));
  }

  private mapCenterFacetValues(res: any): FacetOption[] {
    const raw = res?.response?.values ?? res?.response ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((v: any) => {
      const val = v.value || v.name || v.label || String(v);
      const label = v.label || v.name || v.value || String(v);
      return {
        label: formatCenterLabel(label),
        value: val
      };
    });
  }

  private initFacetReloadPipeline(): void {
    this.facetReloadSubscription = this.facetReload$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.loadFacets());
  }

  private initCenterTypeAhead(): void {
    this.centerPrefixSubscription = this.centerPrefix$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.loadingCenters.set(true)),
        switchMap(prefix =>
          this.resultsApiSE
            .GET_cgspaceFacet('affiliation', prefix || undefined, 100, this.selectedRepositories())
            .pipe(
              finalize(() => this.loadingCenters.set(false)),
              catchError(() => of(null))
            )
        )
      )
      .subscribe(res => {
        if (res) this.centerOptions.set(this.mapCenterFacetValues(res));
      });
  }

  onCenterSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.centerSearch.set(target.value);
    this.centerPrefix$.next((target.value || '').trim());
  }

  private loadFacets(): void {
    // KPM-R-9: the option lists are the union over the selected repositories.
    const repositories = this.selectedRepositories();

    this.loadingTypes.set(true);
    this.resultsApiSE
      .GET_cgspaceFacet('itemtype', undefined, undefined, repositories)
      .pipe(
        finalize(() => this.loadingTypes.set(false)),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        const raw = res?.response?.values ?? res?.response ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
          this.typeOptions.set(
            raw.map((v: any) => ({
              label: v.label || v.value || v.name || String(v),
              value: v.value || v.name || String(v)
            }))
          );
        } else if (this.typeOptions().length === 0) {
          this.typeOptions.set(DEFAULT_CGSPACE_TYPES);
        }
      });

    this.loadingCenters.set(true);
    this.resultsApiSE
      .GET_cgspaceFacet('affiliation', undefined, undefined, repositories)
      .pipe(
        finalize(() => this.loadingCenters.set(false)),
        catchError(() => of(null))
      )
      .subscribe((res: any) => {
        const raw = res?.response?.values ?? res?.response ?? [];
        if (Array.isArray(raw) && raw.length > 0) {
          this.centerOptions.set(this.mapCenterFacetValues(res));
        } else if (this.centerOptions().length === 0) {
          this.centerOptions.set(DEFAULT_CGSPACE_CENTERS);
        }
      });
  }

  // @akili-spec changes/kp-project-strict-filter — design §4 / §9: scoped fetch
  /**
   * The requests one trigger issues. Project-scoped browse: a reset fires linked + related in parallel
   * (both page 0, same text/type/center/year); *Load more* fires only its own scope. Otherwise: one request,
   * with no project parameter (KPSF-R-10).
   */
  private buildScopedRequests(req: { page: number; scope: KpProjectScope | 'all' }): { scope: KpProjectScope; params: Record<string, any> }[] {
    if (!this.isProjectScoped()) {
      return [{ scope: 'related', params: this.buildSearchParams(req.page) }];
    }
    if (req.scope === 'all') {
      return [
        { scope: 'linked', params: this.buildSearchParams(0, 'linked') },
        { scope: 'related', params: this.buildSearchParams(0, 'related') }
      ];
    }
    return [{ scope: req.scope, params: this.buildSearchParams(req.page, req.scope) }];
  }

  /** The signals one scope writes to: the related list doubles as the single list outside the project-scoped browse. */
  private scopeState(scope: KpProjectScope) {
    return scope === 'linked'
      ? {
          items: this.linkedItems,
          total: this.linkedTotal,
          page: this.linkedPage,
          hasMore: this.linkedHasMore,
          status: this.linkedStatus,
          loadingMore: this.linkedLoadingMore,
          sources: this.linkedSources
        }
      : {
          items: this.items,
          total: this.total,
          page: this.page,
          hasMore: this.hasMore,
          status: this.status,
          loadingMore: this.loadingMore,
          sources: this.sources
        };
  }

  private initSearchPipeline(): void {
    this.searchSubscription = this.searchTrigger$
      .pipe(
        switchMap(req => {
          if (req.immediate) {
            return of(req);
          }
          return timer(400).pipe(map(() => req));
        }),
        map(req => ({ req, requests: this.buildScopedRequests(req) })),
        // Design §6.2: identical debounced params do not re-fire; an explicit Enter/Load more always runs.
        distinctUntilChanged(
          (prev, curr) =>
            !curr.req.immediate &&
            JSON.stringify(prev.requests.map(r => r.params)) === JSON.stringify(curr.requests.map(r => r.params))
        ),
        switchMap(({ req, requests }) => {
          for (const { scope, params } of requests) {
            const state = this.scopeState(scope);
            if (!req.append) {
              state.status.set('loading');
              if (scope === 'linked') {
                this.linkedApplied.set(true);
              }
            }
            state.page.set(params['page']);
          }

          // Linked and related run side by side; each paints as soon as it answers.
          return merge(...requests.map(({ scope, params }) => this.fetchScope(scope, params, req.append)));
        })
      )
      .subscribe(outcome => this.applyScopeOutcome(outcome));
  }

  // @akili-spec changes/kp-cgspace-search-retry
  private fetchScope(scope: KpProjectScope, params: Record<string, any>, append: boolean) {
    return defer(() => this.resultsApiSE.GET_cgspaceSearch(params)).pipe(
      map(res => {
        // KCSR-R-1: proxy returns HTTP 200 with body { status: 502 } — treat as failure
        const bodyStatus: number | undefined = (res as any)?.response?.status ?? (res as any)?.response?.statusCode ?? (res as any)?.status ?? (res as any)?.statusCode;
        if (bodyStatus !== undefined && bodyStatus >= 400) {
          throw new Error(`Repository proxy error: ${bodyStatus}`);
        }
        return res;
      }),
      retry({
        count: KpCgspaceBrowseComponent.RETRY_COUNT,
        delay: () => timer(this.retryDelayMs)
      }),
      map(res => ({ res, scope, append, error: null as unknown })),
      catchError(err => of({ res: null as any, scope, append, error: err as unknown }))
    );
  }

  private applyScopeOutcome({ res, scope, append, error }: { res: any; scope: KpProjectScope; append: boolean; error: unknown }): void {
    const state = this.scopeState(scope);
    state.loadingMore.set(false);

    if (error || (res && res.status && res.status >= 400)) {
      state.status.set('error');
      state.items.set([]);
      state.total.set(0);
      state.sources.set([]);
      state.hasMore.set(false);
      if (scope === 'related') this.resetRelatedRanking();
      return;
    }

    // KPM-R-6: chip counts and unavailable states come from every response's sources[].
    const sources: unknown = res?.response?.sources;
    state.sources.set(Array.isArray(sources) ? (sources as SourceStatusDto[]) : []);
    // KPM-R-20: *Load more* renders iff the last response reports page.hasMore.
    state.hasMore.set(Boolean(res?.response?.page?.hasMore));

    const echo: KpProjectScopeEcho | undefined = res?.response?.projectScope;
    if (scope === 'linked') {
      // KPSF-R-9: `applied=false` = the project is not usable; the server answers an empty linked page.
      this.linkedApplied.set(echo ? echo.applied !== false : true);
    } else {
      // KRR-R-8: only a response that says `ranked` switches the proxy note; everything else keeps the quick copy.
      this.relatedRanked.set(echo?.ranked === true);
      if (echo?.ranked === true) {
        this.relatedOnlyEcho.set(echo.relatedOnly === true);
      } else {
        // Unranked list: the toggle is hidden and nothing related-only is ever sent (KRS-R-2 "not available").
        this.resetRelatedRanking();
      }
    }

    let items: CgspaceItemDto[] = res?.response?.items ?? [];
    // @akili-spec changes/kp-related-strongest-first — KRS-R-1 / DD-1: tier-sort ONLY the incoming page (stable), then append; earlier pages never move
    if (scope === 'related' && echo?.ranked === true) {
      items = this.sortPageByTier(items);
    }
    const total: number =
      res?.response?.page?.totalElements ??
      res?.response?.total ??
      (items.length > 0 ? items.length : 0);

    if (items.length > 0) {
      state.status.set('results');
      state.items.set(append ? [...state.items(), ...items] : items);
      state.total.set(total);
    } else if (!append) {
      // (append + empty = reached the end of pagination)
      state.status.set('empty');
      state.items.set([]);
      state.total.set(0);
    }
  }

  private sortPageByTier(page: CgspaceItemDto[]): CgspaceItemDto[] {
    const rank = (item: CgspaceItemDto): number => {
      switch (item?.projectMatch?.tier) {
        case 'strong':
          return 0;
        case 'partial':
          return 1;
        case 'weak':
          return 2;
        default:
          return 3;
      }
    };
    // Array.prototype.sort is stable: ties keep the server order.
    return [...page].sort((a, b) => rank(a) - rank(b));
  }

  private buildSearchParams(page: number, scope?: KpProjectScope): Record<string, any> {
    // KPM-R-3 / KPM-R-8: one request covers every selected repository (comma-joined).
    const params: Record<string, any> = { page, size: 10, repository: this.selectedRepositories().join(',') };

    const q = (this.query() || '').trim();
    // R-2 / AC-8: text shorter than MIN_QUERY_LENGTH is never sent upstream.
    if (q.length >= this.MIN_QUERY_LENGTH) {
      params['query'] = q;
    }

    if (this.selectedType()) {
      params['type'] = this.selectedType();
    }

    if (this.selectedCenter()) {
      params['center'] = this.selectedCenter();
    }

    if (!this.isAdmin()) {
      params['year'] = this.phaseYear();
    } else if (this.selectedYear() !== null && this.selectedYear() !== undefined && this.selectedYear() !== '') {
      params['year'] = this.selectedYear();
    }

    if (scope) {
      // @akili-spec changes/kp-project-strict-filter — design §7. Lengths match the server DTO limits (50 / 300 / 20).
      const code = (this.projectCode() ?? '').trim().slice(0, 50);
      const title = (this.projectTitle() ?? '').trim().slice(0, 300);
      const leadCenter = (this.leadCenterAcronym() ?? '').trim().slice(0, 20);
      if (code) params['projectCode'] = code;
      if (title) params['projectTitle'] = title;
      if (leadCenter) params['projectLeadCenter'] = leadCenter;
      // @akili-spec changes/kp-related-relevance-ranking — design §6. Lengths match the server DTO limits (1000 / 200 / 200).
      const description = (this.projectDescription() ?? '').trim().slice(0, 1000);
      const program = [this.programCode()?.trim(), this.programName()?.trim()].filter(Boolean).join(' - ').slice(0, 200);
      const leadCenterName = centerNameFromAcronym(this.leadCenterAcronym())?.slice(0, 200);
      if (description) params['projectDescription'] = description;
      if (program) params['projectProgram'] = program;
      if (leadCenterName) params['projectLeadCenterName'] = leadCenterName;
      params['projectScope'] = scope;
      // @akili-spec changes/kp-related-strongest-first — KRS-R-2: toggle off sends no key at all (identical to the KRR request)
      if (this.relatedOnly()) params['projectRelatedOnly'] = true;
    }

    return params;
  }

  /**
   * An explicit filter chosen by the user: Type, Center, or (admin only) a Year that differs from the
   * default `phaseYear`. The admin default year is NOT a filter for the min-length rule (AC-8).
   * The project of a project-scoped browse counts as a filter: the linked KPs load without any text (KPSF-R-13).
   */
  hasActiveFilter(): boolean {
    if (this.selectedType() !== null && this.selectedType() !== '') return true;
    if (this.selectedCenter() !== null && this.selectedCenter() !== '') return true;
    if (this.isAdmin() && this.selectedYear() !== this.phaseYear()) return true;
    if (this.isProjectScoped()) return true;
    return false;
  }

  /** Back to the idle panel (nothing searchable): clears both lists. */
  private resetResults(): void {
    for (const scope of ['related', 'linked'] as const) {
      const state = this.scopeState(scope);
      state.status.set('idle');
      state.items.set([]);
      state.total.set(0);
      state.sources.set([]);
    }
    this.resetRelatedRanking();
  }

  /** `relatedRanked` and the related-only toggle always reset together (KRS T-2 forward pointer). */
  private resetRelatedRanking(): void {
    this.relatedRanked.set(false);
    this.relatedOnly.set(false);
    this.relatedOnlyEcho.set(undefined);
  }

  /** Search runs when the text has ≥ 3 chars, or when it is empty and an explicit filter is set. */
  canSearch(): boolean {
    const q = (this.query() || '').trim();
    if (q.length >= this.MIN_QUERY_LENGTH) return true;
    if (q.length === 0 && this.hasActiveFilter()) return true;
    return false;
  }

  onQueryInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.query.set(target.value);
    this.onQueryChange();
  }

  onQueryChange(): void {
    if (!this.canSearch()) {
      this.resetResults();
      return;
    }
    this.searchTrigger$.next({ page: 0, append: false, immediate: false, scope: 'all' });
  }

  onFilterChange(): void {
    if (!this.canSearch()) {
      this.resetResults();
      return;
    }
    this.searchTrigger$.next({ page: 0, append: false, immediate: false, scope: 'all' });
  }

  onTypeSelect(option: any): void {
    const val = option ? (option.value ?? option) : null;
    this.selectedType.set(val);
    this.onFilterChange();
  }

  onCenterSelect(option: any): void {
    const val = option ? (option.value ?? option) : null;
    this.selectedCenter.set(val);
    this.onFilterChange();
  }

  onYearSelect(option: any): void {
    const val = option ? (option.value ?? option) : null;
    this.selectedYear.set(val);
    this.relatedOnly.set(false);
    this.relatedOnlyEcho.set(undefined);
    this.onFilterChange();
  }

  // @akili-spec changes/kp-multi-repository-browse — KPM-R-2 / KPM-AC-2 / KPM-AC-3
  /**
   * Toggle one repository. The last selected one is an invariant, not a disabled button:
   * a click on it changes nothing and issues no request (`KPM-AC-3`).
   */
  toggleRepository(key: KpRepository): void {
    const selected = this.selectedRepositories();
    const isSelected = selected.includes(key);

    if (isSelected && selected.length === 1) {
      return;
    }

    const next = isSelected
      ? selected.filter(repository => repository !== key)
      : this.allRepositories.filter(repository => selected.includes(repository) || repository === key);

    this.selectedRepositories.set(next);
    this.onRepositorySelectionChange();
  }

  /** KPM-R-2: restores the three repositories and re-runs the search once. */
  selectAllRepositories(): void {
    if (this.selectedRepositories().length === this.allRepositories.length) {
      return;
    }
    this.selectedRepositories.set([...this.allRepositories]);
    this.onRepositorySelectionChange();
  }

  /**
   * A selection change reloads the facet unions and re-runs the current search through
   * the existing debounce / identical-params pipeline. With `canSearch()` false,
   * `onFilterChange()` only resets the panel to idle — the strip is the sole update.
   */
  private onRepositorySelectionChange(): void {
    this.facetReload$.next(this.selectedRepositories().join(','));
    this.onFilterChange();
  }

  onEnter(): void {
    if (!this.canSearch()) {
      return;
    }
    this.runSearch(0, false);
  }

  /**
   * Re-sends the full current selection at page 0 with the same params — used by the error-state
   * "Try again" button AND by each per-repository "Retry <repo>" button in the partial notice
   * (`KPM-R-7`, `design.md` §6.2). The server serves healthy sources from cache, so only the
   * failed source is re-queried; there is no per-repository request from the client.
   */
  retrySearch(): void {
    if (this.typeOptions().length === 0 || this.centerOptions().length === 0) {
      this.loadFacets();
    }
    if (!this.canSearch()) {
      return;
    }
    this.status.set('loading');
    this.runSearch(0, false);
  }

  runSearch(page: number = 0, append: boolean = false, scope: KpProjectScope | 'all' = 'all'): void {
    if (!this.canSearch()) {
      this.resetResults();
      return;
    }
    this.searchTrigger$.next({ page, append, immediate: true, scope });
  }

  /** True while any list is fetching: a second trigger would cancel it (`switchMap`), so *Load more* waits. */
  private isFetching(): boolean {
    return this.loadingMore() || this.linkedLoadingMore() || this.status() === 'loading' || this.linkedStatus() === 'loading';
  }

  /** Related list (section 2 in the project-scoped browse): fetches only the related scope; never re-queries linked. */
  loadMore(): void {
    if (this.isFetching()) return;
    const nextPage = this.page() + 1;
    this.loadingMore.set(true);
    this.runSearch(nextPage, true, 'related');
  }

  // @akili-spec changes/kp-related-strongest-first — KRS-R-2: toggling reruns the related search from page 0
  toggleRelatedOnly(): void {
    if (this.relatedOnlyUnavailable() || this.isFetching()) return;
    this.relatedOnly.update(v => !v);
    this.relatedOnlyEcho.set(undefined);
    this.runSearch(0, false, 'related');
  }

  /** Linked list (section 1): fetches only the linked scope; never re-queries related. */
  loadMoreLinked(): void {
    if (this.isFetching()) return;
    const nextPage = this.linkedPage() + 1;
    this.linkedLoadingMore.set(true);
    this.runSearch(nextPage, true, 'linked');
  }

  onSelect(item: CgspaceItemDto): void {
    this.selectingItem.set(item.uuid || item.handle || null);
    // KPM-R-11: the busy overlay names the item's own repository, never a hardcoded one.
    this.selectingRepositoryLabel.set(kpRepositoryLabel(item.repository) || null);
    this.itemSelected.emit(item);
  }

  formatAuthors(authors?: string[] | null): string {
    if (!authors || authors.length === 0) {
      return '';
    }
    if (authors.length === 1) {
      return authors[0];
    }
    return `${authors[0]} et al.`;
  }

  formatMeta(item: CgspaceItemDto): string {
    const parts: string[] = [];
    if (item.type) parts.push(item.type);
    if (item.year !== null && item.year !== undefined) parts.push(String(item.year));
    const authors = this.formatAuthors(item.authors);
    if (authors) parts.push(authors);
    if (item.affiliations && item.affiliations.length > 0 && item.affiliations[0]) {
      parts.push(item.affiliations[0]);
    }
    return parts.join(' · ');
  }

  openItemDetails(item: CgspaceItemDto): void {
    const urlString = item.itemUrl || item.uri || item.handleUrl;
    if (!urlString) return;

    try {
      const url = new URL(urlString);
      if (this.ALLOWED_HOSTS.includes(url.hostname)) {
        window.open(urlString, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Invalid URL, do nothing
    }
  }
}
