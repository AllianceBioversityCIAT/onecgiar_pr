import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subscription, catchError, concat, defer, distinctUntilChanged, filter, interval, map, of, switchMap, take, tap, timer } from 'rxjs';
import { ResultsApiService } from '../../../../../../../../shared/services/api/results-api.service';

// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-results-browse (PTB-T-2)

/** One evidence citation attached to a proposal (`design.md` §4.1 via child 1's whitelist). */
export interface PtProposalEvidenceDto {
  item_key?: string;
  kind?: string;
  name?: string;
  url?: string | null;
}

/** Guidance-only gender split — display only, never written to the create payload (`PTB-R-18`). */
export interface PtProposalGenderSplitDto {
  women: number | null;
  men: number | null;
}

/** CLARISA match outcome PT attaches to a country / region / partner. `null` = PT sent none. */
export type PtMatchStatus = 'matched' | 'unmatched' | 'ambiguous' | 'suggested' | string;

export interface PtCountryDto {
  name: string;
  iso_alpha_2: string | null;
  clarisa_id: number | null;
  match_status: PtMatchStatus | null;
}

export interface PtRegionDto {
  name: string;
  match_status: PtMatchStatus | null;
}

/** Display-only geography (`PTB-R-18`): never written to the create payload. */
export interface PtGeoDto {
  level: string | null;
  countries: PtCountryDto[];
  regions: PtRegionDto[];
  subnational_areas: string | null;
}

export interface PtPartnerDto {
  name: string;
  acronym: string | null;
  role: string | null;
  match_status: PtMatchStatus | null;
  is_cgiar_center: boolean | null;
}

export interface PtImpactAreaDetailDto {
  key: string;
  label: string;
  score: number | null;
  justification: string;
}

export interface PtEvidenceLinkDto {
  url: string;
  title: string;
  kind: string | null;
}

/**
 * One Progress Tracker drafting proposal, mapped from child 1's `results[]` item
 * (`../../progress-tracker-indicator-mapping/design.md` §4.1, the staging fixture
 * `onecgiar-pr-server/src/api/progress-tracker/fixtures/pt-results.staging.json`).
 *
 * `generated_at` / `evidence_fingerprint` are envelope-level fields (not per-result) that are
 * copied onto every proposal here so the host (`PTB-T-3`) and the payload builder (`PTB-T-5`)
 * can send them back as provenance without a second lookup — the Implementer's documented choice
 * for the "your call, document it" instruction in `design.md` §4.1 / `PTB-R-16`.
 */
export interface PtProposalDto {
  result_key: string;
  result_type: string;
  result_type_label: string;
  title: string;
  description: string;
  evidence: PtProposalEvidenceDto[];
  countries: string[];
  impact_areas: Record<string, number | string> | null;
  gender_split: PtProposalGenderSplitDto | null;
  knowledge_product_handle: string | null;
  confidence: number | null;
  rationale: string;
  missing_info: string[];
  /**
   * Display-only detail blocks (PT 2026-10-15). Empty / `null` when PT does not send them — the
   * 2-oct PT build in prod has none. Guidance only, never in the create payload (`PTB-R-18`).
   */
  geo: PtGeoDto | null;
  partners: PtPartnerDto[];
  impact_area_details: PtImpactAreaDetailDto[];
  /** Only http(s) links survive normalization. */
  evidence_links: PtEvidenceLinkDto[];
  /** Envelope-level provenance, copied onto each proposal — see class doc above. */
  generated_at?: string;
  evidence_fingerprint?: string;
}

/**
 * `generated_by` as PT sends it. Only the keys the panel reads are named; PT builds older than
 * 2026-10-15 carry none of `complete` / `more_results_expected` / `notice`.
 */
export interface PtGeneratedBy {
  mode?: string;
  fallback_reason?: string | null;
  /** `false` = PT cut drafting short (its 24 s budget) and returned what it had. */
  complete?: boolean;
  more_results_expected?: boolean;
  notice?: string | null;
}

/** Top-level `preparation` (PT 2026-10-15): the KPI is still being prepared upstream. */
export interface PtPreparation {
  status?: string;
  retry_after_s?: number | null;
  pending_group_ids?: string[];
}

/** `child 1`'s house envelope, nested per `design.md` `P-13` — never a top-level `status`. */
export interface PtResultsEnvelope {
  statusCode?: number;
  message?: string;
  response?: {
    status?: 'ok' | 'not_found' | 'unavailable' | string;
    indicator?: Record<string, unknown>;
    results?: unknown[];
    evidence_count?: number;
    generated_by?: PtGeneratedBy | null;
    preparation?: PtPreparation | null;
    source?: { system?: string; environment?: string; pt_url?: string };
    generated_at?: string;
    evidence_fingerprint?: string;
  };
}

/** The component's own rendered states. `picked` (`PTB-R-3`) is the host's banner, not a seventh value here (`design.md` §6.1). */
export type PtResultsBrowseStatus =
  | 'idle'
  | 'choose_center'
  | 'loading'
  | 'results'
  | 'empty'
  /** Empty because PT is still preparing this KPI — "check again in a few minutes". */
  | 'preparing'
  /** The call ran out of time (proxy 27 s / gateway 29 s) while PT keeps drafting in the background. */
  | 'still_working'
  | 'not_found'
  | 'unavailable';

/** `generated_by.fallback_reason` values that mean "not ready yet", not "nothing to draft from". */
const PREPARING_FALLBACK_REASONS = new Set(['preparing', 'live_drafting_busy', 'live_draft_in_progress']);

/**
 * An `unavailable` (or a transport failure) that took at least this long is a timeout: the proxy
 * aborts at 27 s and API Gateway at 29 s, while a real outage answers in well under a second.
 */
export const PT_STILL_WORKING_AFTER_MS = 20_000;

/**
 * Wait before the single automatic retry after a timeout. PT keeps drafting after the proxy gives
 * up, so the second call normally answers quickly from PT's cache.
 */
export const PT_AUTO_RETRY_DELAY_MS = 8_000;

/** Upper bound for `preparation.retry_after_s`, so a large value never locks Check again for long. */
const PT_MAX_RETRY_AFTER_S = 300;

const PT_DEFAULT_PARTIAL_NOTICE = 'The Progress Tracker is still drafting more proposals for this KPI. Check again in a moment to see them.';

/** One settled call: the envelope, plus whether it looked like a timeout rather than an outage. */
interface PtFetchOutcome {
  envelope: PtResultsEnvelope;
  stillWorking: boolean;
}

/** One fetch key: the PRMS indicator plus the center whose PT KPI is wanted. */
interface PtRequest {
  id: string | number;
  center: string | null;
  needsCenterChoice: boolean;
  /** Bumped by Check again — makes an identical (indicator, center) request fetch again. */
  reload: number;
}

/**
 * Shape of one raw `results[]` item as child 1's envelope carries it (staging fixture
 * `onecgiar-pr-server/src/api/progress-tracker/fixtures/pt-results.staging.json`), narrowed to an
 * explicit interface — deliberately **not** `Record<string, any>` — so `toProposal()` reads named
 * properties instead of an index signature (`noPropertyAccessFromIndexSignature` / TS4111; the
 * host now reaches this file through `tsconfig.app.json`'s compile graph via `PTB-T-3`, and an
 * index-signature type fails that gate even though it passed ts-jest, which does not enforce it).
 */
interface PtRawProposal {
  result_key?: string;
  result_type?: string;
  result_type_label?: string;
  title?: string;
  description?: string;
  evidence?: PtProposalEvidenceDto[];
  /** Plain names (2-oct PT build) or CLARISA-matched objects (2026-10-15). */
  countries?: unknown[];
  impact_areas?: Record<string, number | string> | null;
  gender_split?: PtProposalGenderSplitDto | null;
  knowledge_product_handle?: string | null;
  confidence?: number;
  rationale?: string;
  missing_info?: string[];
  geo_scope?: {
    level?: unknown;
    countries?: unknown[];
    regions?: unknown[];
    regions_detail?: unknown[];
    subnational_areas?: unknown;
  } | null;
  regions_detail?: unknown[] | null;
  subnational_areas?: unknown;
  partners?: unknown[] | null;
  impact_area_details?: Record<string, { score?: unknown; justification?: unknown } | null> | null;
  evidence_links?: unknown[] | null;
}

/** Labels for the CGIAR impact-area keys PT uses; anything else is title-cased from its key. */
const IMPACT_AREA_LABELS: Record<string, string> = {
  nutrition: 'Nutrition, health & food security',
  poverty: 'Poverty reduction, livelihoods & jobs',
  gender: 'Gender equality, youth & social inclusion',
  climate: 'Climate adaptation & mitigation',
  environment: 'Environmental health & biodiversity'
};

/** CGIAR impact-area score scale: 0 Not targeted, 1 Significant, 2 Principal. */
const IMPACT_SCORE_LABELS: Record<number, string> = { 0: 'Not targeted', 1: 'Significant', 2: 'Principal' };

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const asTextOrNull = (value: unknown): string | null => asText(value) || null;
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** A name string or an object with `name` (and optional CLARISA match fields). */
function toCountry(value: unknown): PtCountryDto | null {
  if (typeof value === 'string') {
    return value.trim() ? { name: value.trim(), iso_alpha_2: null, clarisa_id: null, match_status: null } : null;
  }
  const rec = asRecord(value);
  const name = asText(rec?.['name']);
  if (!rec || !name) return null;
  const clarisaId = Number(rec['clarisa_id']);
  return {
    name,
    iso_alpha_2: asTextOrNull(rec['iso_alpha_2']),
    clarisa_id: rec['clarisa_id'] !== null && rec['clarisa_id'] !== undefined && Number.isFinite(clarisaId) ? clarisaId : null,
    match_status: asTextOrNull(rec['match_status'])
  };
}

function toRegion(value: unknown): PtRegionDto | null {
  if (typeof value === 'string') return value.trim() ? { name: value.trim(), match_status: null } : null;
  const rec = asRecord(value);
  const name = asText(rec?.['name']);
  return rec && name ? { name, match_status: asTextOrNull(rec['match_status']) } : null;
}

/** `subnational_areas` is informative text; an array of names or `{ name }` objects is joined. */
function toSubnational(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (!Array.isArray(value)) return null;
  const names = value.map(v => (typeof v === 'string' ? v.trim() : asText(asRecord(v)?.['name']))).filter(Boolean);
  return names.length ? names.join(', ') : null;
}

const nonNull = <T>(value: T | null): value is T => value !== null;

/** Only absolute http(s) URLs are rendered as links — never `javascript:`, `data:` or relative. */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-pt-results-browse',
  imports: [],
  templateUrl: './pt-results-browse.component.html',
  styleUrls: ['./pt-results-browse.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PtResultsBrowseComponent {
  private readonly resultsApiSE = inject(ResultsApiService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs — design.md §6.1
  readonly tocIndicatorId = input<string | number | null>(null);
  readonly indicatorFixesResultType = input<boolean>(false);
  readonly isKnowledgeProduct = input<boolean>(false);
  readonly busy = input<boolean>(false);
  /**
   * PRMS center acronym of the row being reported — PT keeps one KPI per (indicator, center), so
   * it is sent with the request. `null` sends none (the server then uses the indicator's only
   * mapping row). The host resolves it (`LabReportFormComponent.ptCenter`).
   */
  readonly center = input<string | null>(null);
  /** True while a target shared by several centers has no center chosen yet: nothing is fetched. */
  readonly awaitingCenter = input<boolean>(false);

  // Outputs — design.md §6.1
  readonly proposalSelected = output<PtProposalDto>();
  readonly switchToManual = output<void>();

  // State
  readonly status = signal<PtResultsBrowseStatus>('idle');
  readonly proposals = signal<PtProposalDto[]>([]);
  readonly selectedKey = signal<string | null>(null);
  /** `source.pt_url` from the last envelope — display-only deep link (`PTB-R-6c`, `PTB-R-23`). */
  readonly ptUrl = signal<string | null>(null);
  /** Shown above the proposals when PT returned a partial list (`generated_by.complete === false`). */
  readonly partialNotice = signal<string | null>(null);
  /** True while the one automatic retry after a timeout is pending — the spinner stays up. */
  readonly autoRetrying = signal(false);
  /** Seconds left before Check again is enabled (`preparation.retry_after_s`); 0 = enabled. */
  readonly checkAgainCooldownS = signal(0);
  private readonly reload = signal(0);
  /** `reload` of the last fetch cycle — a higher value marks a manual Check again. */
  private lastCycleReload = 0;
  private cooldownSub: Subscription | null = null;

  private readonly request = computed<PtRequest | null>(() => {
    const id = this.tocIndicatorId();
    if (id === null || id === undefined || id === '') return null;
    return {
      id,
      center: (this.center() ?? '').trim() || null,
      needsCenterChoice: this.awaitingCenter(),
      reload: this.reload()
    };
  });

  constructor() {
    // PTB-T-2 Leader clarification: fetch is driven by `tocIndicatorId` becoming set/changing —
    // there is no separate "active" input. The host mounts this component lazily and keeps it
    // [hidden] thereafter, so a user who never opens the tab never triggers this pipeline.
    //
    // Reviewer fix (stale-response race, attempt 2): the host keeps this component mounted
    // `[hidden]` across indicators, so `tocIndicatorId` CAN change while a previous request is
    // still in flight (e.g. cold indicator A ~20s, then the user switches to cached indicator B).
    // `switchMap` is what cancels A's still-open subscription the moment B's id arrives — a plain
    // `effect()` opening a fresh `.subscribe()` per change (attempt 1) never unsubscribed from the
    // previous one, so A's late envelope could overwrite B's already-rendered state and corrupt
    // the `result_key` / `generated_at` / `evidence_fingerprint` provenance PTB-T-5 sends back.
    //
    // `distinctUntilChanged()` after `filter()` is the `PTB-R-22` guard: A → null → A collapses to
    // one fetch (the two `A` values are consecutive once the intervening `null` is filtered out),
    // while A → B always fetches twice. `takeUntilDestroyed()` releases the subscription with the
    // component instead of leaking it past teardown.
    //
    // The key is (indicator, center): a different center of the same indicator is a different PT
    // KPI and fetches again; a shared target with no center chosen yet fetches nothing.
    //
    // `reload` (Check again) is part of the key, so a manual re-check of the very same KPI fetches
    // even though the panel is retained. A timeout gets ONE automatic retry after
    // PT_AUTO_RETRY_DELAY_MS — only on a cycle the user did not start with Check again, so the
    // panel never re-queries on its own more than once.
    toObservable(this.request)
      .pipe(
        filter((req): req is PtRequest => req !== null),
        distinctUntilChanged(
          (a, b) => a.id === b.id && a.center === b.center && a.needsCenterChoice === b.needsCenterChoice && a.reload === b.reload
        ),
        map(req => {
          const manual = req.reload !== this.lastCycleReload;
          this.lastCycleReload = req.reload;
          return { req, manual };
        }),
        tap(({ req }) => {
          this.status.set(req.needsCenterChoice ? 'choose_center' : 'loading');
          this.proposals.set([]);
          this.ptUrl.set(null);
          this.selectedKey.set(null);
          this.partialNotice.set(null);
          this.autoRetrying.set(false);
          this.stopCooldown();
        }),
        switchMap(({ req, manual }) => {
          if (req.needsCenterChoice) return EMPTY;
          return this.fetchOnce(req).pipe(
            switchMap(first => {
              if (!first.stillWorking || manual) return of(first);
              return concat(
                defer(() => {
                  this.autoRetrying.set(true);
                  return EMPTY;
                }),
                timer(PT_AUTO_RETRY_DELAY_MS).pipe(switchMap(() => this.fetchOnce(req)))
              );
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(outcome => this.applyOutcome(outcome));

    this.destroyRef.onDestroy(() => this.stopCooldown());
  }

  /**
   * One call to the proxy. PTB-R-8: a transport-level failure maps to the same 'unavailable'
   * branch as an HTTP-200 envelope carrying status 'unavailable'. Never echoes the caught error
   * into the UI (`PTB-AC-7`, `.cursorrules`) — only its numeric HTTP status is read.
   *
   * There is no client-side timeout on this call (no `timeout()` here or in
   * `GeneralInterceptorService`): the proxy answers by 27 s and API Gateway cuts at 29 s, so the
   * classified answer always comes from the server side.
   */
  private fetchOnce(req: PtRequest): Observable<PtFetchOutcome> {
    const started = Date.now();
    const call = req.center
      ? this.resultsApiSE.GET_progressTrackerResults(req.id, {}, req.center)
      : this.resultsApiSE.GET_progressTrackerResults(req.id, {});
    const tookTooLong = () => Date.now() - started >= PT_STILL_WORKING_AFTER_MS;
    return call.pipe(
      map((envelope: PtResultsEnvelope) => ({
        envelope,
        stillWorking: envelope?.response?.status === 'unavailable' && tookTooLong()
      })),
      catchError((err: unknown) => {
        const httpStatus = (err as { status?: unknown } | null)?.status;
        return of<PtFetchOutcome>({
          envelope: { response: { status: 'unavailable' } },
          stillWorking: httpStatus === 504 || tookTooLong()
        });
      })
    );
  }

  private applyOutcome(outcome: PtFetchOutcome): void {
    this.autoRetrying.set(false);
    if (outcome.stillWorking) {
      this.proposals.set([]);
      this.ptUrl.set(null);
      this.status.set('still_working');
      return;
    }
    this.applyEnvelope(outcome.envelope);
  }

  /**
   * Check again: skips the panel's retained state and asks the proxy again for the same KPI.
   * No `refresh=true` upstream — PT's own cache is what makes the second answer fast.
   */
  checkAgain(): void {
    if (this.checkAgainCooldownS() > 0) return;
    this.reload.update(n => n + 1);
  }

  /**
   * The single place that classifies child 1's envelope into a rendered state (`PTB-R-8`).
   * Kept as one `if` chain on purpose — the falsifier for `PTB-AC-7` mutates the final branch,
   * and both the real `unavailable` fixture and the transport-failure fixture must go red from
   * that one mutation, because both funnel through it.
   */
  private applyEnvelope(envelope: PtResultsEnvelope | null | undefined): void {
    const body = envelope?.response ?? {};
    this.ptUrl.set(body.source?.pt_url ?? null);

    if (body.status === 'ok') {
      // `generated_by.mode === 'template'`: PT returned blank templates — those are not proposals.
      const generatedBy = body.generated_by && typeof body.generated_by === 'object' ? body.generated_by : null;
      const isTemplate = generatedBy?.mode === 'template';
      const isPartial = generatedBy?.complete === false || generatedBy?.more_results_expected === true;
      const raw = !isTemplate && Array.isArray(body.results) ? body.results : [];
      const mapped = raw.map(item => this.toProposal(item, body));
      this.proposals.set(mapped);

      if (mapped.length > 0) {
        const notice = typeof generatedBy?.notice === 'string' ? generatedBy.notice.trim() : '';
        this.partialNotice.set(isPartial ? notice || PT_DEFAULT_PARTIAL_NOTICE : null);
        this.status.set('results');
        return;
      }

      // Nothing to show: either PT is still preparing this KPI (template fallback for a
      // "not ready yet" reason, a retry hint, or a partial answer with nothing in it yet), or
      // there really is nothing to propose.
      const retryAfter = body.preparation?.retry_after_s;
      const hasRetryAfter = retryAfter !== null && retryAfter !== undefined;
      const preparing =
        (isTemplate && PREPARING_FALLBACK_REASONS.has(String(generatedBy?.fallback_reason ?? ''))) || hasRetryAfter || isPartial;
      if (preparing) {
        this.startCooldown(Number(retryAfter));
        this.status.set('preparing');
        return;
      }
      this.status.set('empty');
      return;
    }

    if (body.status === 'not_found') {
      this.proposals.set([]);
      this.status.set('not_found');
      return;
    }

    // PTB-R-8: 'unavailable' (real, or synthesized above from a transport failure) lands here.
    this.proposals.set([]);
    this.status.set('unavailable');
  }

  private toProposal(raw: unknown, body: NonNullable<PtResultsEnvelope['response']>): PtProposalDto {
    const item = (raw ?? {}) as PtRawProposal;
    return {
      result_key: item.result_key ?? '',
      result_type: item.result_type ?? '',
      result_type_label: item.result_type_label ?? item.result_type ?? '',
      title: item.title ?? '',
      description: item.description ?? '',
      evidence: Array.isArray(item.evidence) ? item.evidence : [],
      countries: (Array.isArray(item.countries) ? item.countries : [])
        .map(toCountry)
        .filter(nonNull)
        .map(c => c.name),
      impact_areas: item.impact_areas ?? null,
      gender_split: item.gender_split ?? null,
      knowledge_product_handle: item.knowledge_product_handle ?? null,
      confidence: typeof item.confidence === 'number' ? item.confidence : null,
      rationale: item.rationale ?? '',
      missing_info: Array.isArray(item.missing_info) ? item.missing_info : [],
      geo: this.toGeo(item),
      partners: this.toPartners(item.partners),
      impact_area_details: this.toImpactAreaDetails(item.impact_area_details),
      evidence_links: this.toEvidenceLinks(item.evidence_links),
      generated_at: body.generated_at,
      evidence_fingerprint: body.evidence_fingerprint
    };
  }

  /**
   * Geography from `geo_scope` (2026-10-15) with result-level `countries` / `regions_detail` /
   * `subnational_areas`. Result-level countries win when PT sends both; `null` when nothing is set.
   */
  private toGeo(item: PtRawProposal): PtGeoDto | null {
    const scope = asRecord(item.geo_scope);
    const itemCountries = (Array.isArray(item.countries) ? item.countries : []).map(toCountry).filter(nonNull);
    const scopeCountries = (Array.isArray(scope?.['countries']) ? (scope['countries'] as unknown[]) : []).map(toCountry).filter(nonNull);
    const regionSource = [item.regions_detail, scope?.['regions_detail'], scope?.['regions']].find(
      (list): list is unknown[] => Array.isArray(list) && list.length > 0
    );
    const geo: PtGeoDto = {
      level: asTextOrNull(scope?.['level']),
      countries: itemCountries.length ? itemCountries : scopeCountries,
      regions: (regionSource ?? []).map(toRegion).filter(nonNull),
      subnational_areas: toSubnational(item.subnational_areas) ?? toSubnational(scope?.['subnational_areas'])
    };
    const empty = !geo.level && !geo.countries.length && !geo.regions.length && !geo.subnational_areas;
    return empty ? null : geo;
  }

  private toPartners(raw: unknown): PtPartnerDto[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(value => {
        const rec = asRecord(value);
        const name = asText(rec?.['name']) || asText(rec?.['acronym']);
        if (!rec || !name) return null;
        const center = rec['is_cgiar_center'];
        return {
          name,
          acronym: asTextOrNull(rec['acronym']),
          role: asTextOrNull(rec['role']),
          match_status: asTextOrNull(rec['match_status']),
          is_cgiar_center: typeof center === 'boolean' ? center : null
        };
      })
      .filter(nonNull);
  }

  private toImpactAreaDetails(raw: PtRawProposal['impact_area_details']): PtImpactAreaDetailDto[] {
    const rec = asRecord(raw);
    if (!rec) return [];
    return Object.entries(rec)
      .map(([key, value]) => {
        const detail = asRecord(value);
        if (!detail) return null;
        const score = Number(detail['score']);
        return {
          key,
          label: IMPACT_AREA_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
          score: detail['score'] !== null && detail['score'] !== undefined && Number.isFinite(score) ? score : null,
          justification: asText(detail['justification'])
        };
      })
      .filter(nonNull);
  }

  private toEvidenceLinks(raw: unknown): PtEvidenceLinkDto[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(value => {
        const rec = asRecord(value);
        const url = typeof value === 'string' ? value : rec?.['url'];
        if (!isSafeHttpUrl(url)) return null;
        return { url: url.trim(), title: asText(rec?.['title']) || url.trim(), kind: asTextOrNull(rec?.['kind']) };
      })
      .filter(nonNull);
  }

  /** `Not targeted` / `Significant` / `Principal` for 0 / 1 / 2; the raw number otherwise. */
  impactScoreLabel(score: number | null): string {
    if (score === null) return 'Not scored';
    return IMPACT_SCORE_LABELS[score] ?? `Score ${score}`;
  }

  /** `matched` → in CLARISA; any other status PT sends → not in CLARISA; none → no badge. */
  clarisaBadge(matchStatus: PtMatchStatus | null): 'in' | 'out' | null {
    if (!matchStatus) return null;
    return matchStatus === 'matched' ? 'in' : 'out';
  }

  /** Disables Check again for `seconds` (clamped), counting down once per second. */
  private startCooldown(seconds: number): void {
    this.stopCooldown();
    const total = Number.isFinite(seconds) ? Math.min(Math.max(Math.ceil(seconds), 0), PT_MAX_RETRY_AFTER_S) : 0;
    this.checkAgainCooldownS.set(total);
    if (total === 0) return;
    this.cooldownSub = interval(1000)
      .pipe(take(total))
      .subscribe(() => this.checkAgainCooldownS.update(n => Math.max(n - 1, 0)));
  }

  private stopCooldown(): void {
    this.cooldownSub?.unsubscribe();
    this.cooldownSub = null;
    this.checkAgainCooldownS.set(0);
  }

  onSelect(proposal: PtProposalDto): void {
    this.selectedKey.set(proposal.result_key);
    this.proposalSelected.emit(proposal);
  }

  onSwitchToManual(): void {
    this.switchToManual.emit();
  }

  confidencePercent(confidence: number | null): string {
    if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
      return '—';
    }
    return `${Math.round(confidence * 100)}%`;
  }

  /** `PTB-R-18`: countries / impact areas / gender split render as guidance text only. */
  impactAreaSummary(impactAreas: Record<string, number | string> | null): string {
    if (!impactAreas) {
      return '';
    }
    return Object.entries(impactAreas)
      .filter(([key, value]) => key !== 'justification' && typeof value === 'number')
      .map(([key, value]) => `${key} ${value}`)
      .join(', ');
  }
}
