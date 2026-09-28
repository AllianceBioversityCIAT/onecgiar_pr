import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, filter, of, switchMap, tap } from 'rxjs';
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
  /** Envelope-level provenance, copied onto each proposal — see class doc above. */
  generated_at?: string;
  evidence_fingerprint?: string;
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
    generated_by?: unknown;
    source?: { system?: string; environment?: string; pt_url?: string };
    generated_at?: string;
    evidence_fingerprint?: string;
  };
}

/** The component's own rendered states. `picked` (`PTB-R-3`) is the host's banner, not a seventh value here (`design.md` §6.1). */
export type PtResultsBrowseStatus = 'idle' | 'loading' | 'results' | 'empty' | 'not_found' | 'unavailable';

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
  countries?: string[];
  impact_areas?: Record<string, number | string> | null;
  gender_split?: PtProposalGenderSplitDto | null;
  knowledge_product_handle?: string | null;
  confidence?: number;
  rationale?: string;
  missing_info?: string[];
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

  // Outputs — design.md §6.1
  readonly proposalSelected = output<PtProposalDto>();
  readonly switchToManual = output<void>();

  // State
  readonly status = signal<PtResultsBrowseStatus>('idle');
  readonly proposals = signal<PtProposalDto[]>([]);
  readonly selectedKey = signal<string | null>(null);
  /** `source.pt_url` from the last envelope — display-only deep link (`PTB-R-6c`, `PTB-R-23`). */
  readonly ptUrl = signal<string | null>(null);

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
    toObservable(this.tocIndicatorId)
      .pipe(
        filter((id): id is string | number => id !== null && id !== undefined && id !== ''),
        distinctUntilChanged(),
        tap(() => {
          this.status.set('loading');
          this.ptUrl.set(null);
          this.selectedKey.set(null);
        }),
        switchMap(id =>
          this.resultsApiSE.GET_progressTrackerResults(id, {}).pipe(
            // PTB-R-8: a transport-level failure maps to the same 'unavailable' branch as an
            // HTTP-200 envelope carrying status 'unavailable' — see applyEnvelope() below. Never
            // echoes the caught error into the UI (`PTB-AC-7`, `.cursorrules`).
            catchError(() => of<PtResultsEnvelope>({ response: { status: 'unavailable' } }))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(envelope => this.applyEnvelope(envelope));
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
      const raw = Array.isArray(body.results) ? body.results : [];
      const mapped = raw.map(item => this.toProposal(item, body));
      this.proposals.set(mapped);
      this.status.set(mapped.length > 0 ? 'results' : 'empty');
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
      countries: Array.isArray(item.countries) ? item.countries : [],
      impact_areas: item.impact_areas ?? null,
      gender_split: item.gender_split ?? null,
      knowledge_product_handle: item.knowledge_product_handle ?? null,
      confidence: typeof item.confidence === 'number' ? item.confidence : null,
      rationale: item.rationale ?? '',
      missing_info: Array.isArray(item.missing_info) ? item.missing_info : [],
      generated_at: body.generated_at,
      evidence_fingerprint: body.evidence_fingerprint
    };
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
