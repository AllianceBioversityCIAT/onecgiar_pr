import { DestroyRef, Injectable, Injector, WritableSignal, signal } from '@angular/core';
import { PhasesService } from '../../../../../../../shared/services/global/phases.service';
import { ResultsApiService } from '../../../../../../../shared/services/api/results-api.service';

/** Shape `IpsrListFilterService.programOptions()` emits — mirrors Results Center's
 * submitter/program option shape (`{ official_code, displayName }`, see
 * `results-list-filters.component.ts`'s `displayName: \`${submitter.official_code} ${submitter.name}\``). */
export interface IpsrProgramOption {
  official_code: string;
  displayName: string;
  [key: string]: unknown;
}

/** Shape `IpsrListFilterService.phaseOptions()` emits — mirrors RC's `buildPhaseOptions()`. */
export interface IpsrPhaseOption {
  id: number | string;
  attr: string;
  name: string;
  selected: boolean;
  [key: string]: unknown;
}

/**
 * Program (initiative) filter options, reshaped from `api.dataControlSE.myInitiativesListIPSRByPortfolio`
 * into the `{ official_code, displayName }` shape Results Center uses for its Program/Submitter filter.
 * Rows without an `official_code` are dropped — they can't be rendered or matched as a filter chip.
 * Pure/exported so `IPSR-T-1`'s derivation tests can assert values directly, without TestBed.
 */
export function buildIpsrProgramOptions(initiatives: any[]): IpsrProgramOption[] {
  return (initiatives ?? [])
    .filter(initiative => !!initiative?.official_code)
    .map(initiative => ({
      ...initiative,
      official_code: initiative.official_code,
      displayName:
        (initiative.official_code_short_name && String(initiative.official_code_short_name).trim()) ||
        `${initiative.official_code}${initiative.short_name ? ' ' + initiative.short_name : ''}`
    }));
}

/**
 * Phase filter options, reshaped from `PhasesService.phases.ipsr` — mirrors RC's private
 * `buildPhaseOptions()` (`results-list-filters.component.ts`), adding the `(Open)`/`(Closed)`
 * label suffix. Entries without an `id` or `phase_name` are dropped as unusable filter targets.
 */
export function buildIpsrPhaseOptions(phases: any[]): IpsrPhaseOption[] {
  return (phases ?? [])
    .filter(phase => phase?.id != null && !!phase?.phase_name)
    .map(phase => {
      const label = `${phase.phase_name}${phase?.obj_portfolio?.acronym ? ' - ' + phase.obj_portfolio.acronym : ''}`;
      return {
        ...phase,
        attr: label,
        selected: !!phase.status,
        name: label + (phase.status ? ' (Open)' : ' (Closed)')
      };
    });
}

/**
 * Package status filter options — the distinct, non-blank `status` values already present in the
 * loaded `ipsrDataControlSE.ipsrResultList` rows (`IPSR-DD-2`: derived client-side, no dedicated
 * status endpoint). Blank/`null`/non-string `status` values are dropped rather than surfaced as a
 * meaningless empty-label option.
 */
export function buildIpsrStatusOptions(resultList: any[]): string[] {
  const statuses = (resultList ?? [])
    .map(row => row?.status)
    .filter((status: unknown): status is string => typeof status === 'string' && status.trim().length > 0);
  return Array.from(new Set(statuses));
}

@Injectable({
  providedIn: 'root'
})
export class IpsrListFilterService {
  /** Program (initiative) facet — primary filter row, applied live. `IPSR-R-1`. */
  readonly programOptions: WritableSignal<IpsrProgramOption[]> = signal([]);
  /** Empty selection = unfiltered (`IPSR-DD-4`). */
  readonly selectedPrograms: WritableSignal<any[]> = signal([]);

  /** Phase facet — primary filter row, multiselect. `IPSR-R-2`. */
  readonly phaseOptions: WritableSignal<IpsrPhaseOption[]> = signal([]);
  /** Empty selection = unfiltered (`IPSR-DD-4`). */
  readonly selectedPhases: WritableSignal<any[]> = signal([]);

  /** Package status facet — primary filter row. `IPSR-R-3` / `IPSR-DD-2`. */
  readonly statusOptions: WritableSignal<string[]> = signal([]);
  /** Empty selection = unfiltered (`IPSR-DD-4`). */
  readonly selectedStatus: WritableSignal<string[]> = signal([]);

  /**
   * Portfolio facet — "More filters" popover, applied only via `applyFilters()`. `IPSR-R-10` / `IPSR-DD-3`.
   * Center was originally scoped in here too but was removed post-hoc (`IPSR-DD-3`, revised 2026-09-14) —
   * `IpsrRepository.getAllInnovationPackages` has no center column on IPSR list rows.
   * Fetched once via `ResultsApiService.GET_ClarisaPortfolios()`, triggered by `loadSecondaryFacetOptions()`
   * (called from the page component's `ngOnInit`, not from this service's constructor) — the same
   * catalog call Results Center makes for its own Portfolio filter (`results-list-filters.component.ts#getClarisaPortfolios`).
   */
  readonly portfolioOptions: WritableSignal<any[]> = signal([]);
  /** Committed Portfolio selection — only changes on `applyFilters()`, never directly from the popover. */
  readonly selectedPortfolios: WritableSignal<any[]> = signal([]);
  /** Draft Portfolio selection the popover mutates while open; discarded on `cancelFilters()`. */
  readonly tempSelectedPortfolios: WritableSignal<any[]> = signal([]);

  /**
   * Guards `loadSecondaryFacetOptions()` so repeated calls (e.g. from a component's `ngOnInit`
   * running more than once) issue at most one Portfolio request. `design.md` §6.2 /
   * §8 — this is a "one-time fetch on page load", not on service construction: this service is
   * `providedIn: 'root'` and instantiated at app bootstrap (via `ApiService` → `app.component.ts`)
   * for every route, including `/login` before a token exists, so fetching eagerly in the
   * constructor would fire this call for every user on every page load, not just Innovation
   * Packages. `IPSR-T-5`'s component `ngOnInit` is the intended caller — this task only exposes
   * and guards the method, it does not call it.
   */
  private optionsLoaded = false;

  private phasesService?: PhasesService;
  private resultsApiService?: ResultsApiService;

  /**
   * Flips true once this service's own injection context is torn down. Guards the deferred
   * `queueMicrotask` callback below — see that callback's comment for why the guard exists.
   */
  private destroyed = false;

  /**
   * `PhasesService` and `ResultsApiService` both ultimately depend on `HttpClient`. This service is
   * eagerly instantiated as a field of `ApiService`, which `GreenChecksService` and
   * `IpsrCompletenessStatusService` inject — and both of those sit in `GeneralInterceptorService`,
   * a provider of `HTTP_INTERCEPTORS`. Injecting `PhasesService`/`ResultsApiService` directly in
   * this constructor made `HttpClient` depend on itself while it was still being built to resolve
   * its own interceptor list (`NG0200: Circular dependency detected for HTTP_INTERCEPTORS`).
   * Resolving them lazily via `Injector`, one microtask after construction, escapes that window —
   * matches the same escape-hatch `ViewRefreshService.schedule()` uses for a comparable timing
   * problem. Nothing here is read before the app's first paint.
   */
  constructor(private readonly injector: Injector, destroyRef: DestroyRef) {
    // `DestroyRef` has no `HttpClient` dependency, so injecting it synchronously here does not
    // reopen the `NG0200` window above — it only lets the deferred microtask below know whether
    // this service's own injector has since been torn down.
    destroyRef.onDestroy(() => {
      this.destroyed = true;
    });

    queueMicrotask(() => {
      // A spec that uses `jest.useFakeTimers()` (e.g. `complementary-innovation.component.spec.ts`,
      // which provides `ApiService` and transitively constructs this service) patches
      // `queueMicrotask` globally, so this callback can fire AFTER TestBed has already destroyed
      // the injector that created this service — `this.injector.get(...)` would then throw
      // `NG0205: Injector has already been destroyed`. Bail out rather than let that escape; there
      // is nothing left to wire up once the owning injector is gone.
      if (this.destroyed) {
        return;
      }

      const phasesService = this.injector.get(PhasesService);
      this.phasesService = phasesService;
      // Pull whatever PhasesService already resolved (covers the construction order where its
      // versioning fetch already completed before this service subscribed) ...
      this.refreshPhaseOptions();
      // ... then stay in sync with future phase loads. PhasesService no longer writes into this
      // service directly (`phases.service.ts`) — this service now owns its own derivation via
      // `buildIpsrPhaseOptions()`, keeping PhasesService a pure data source.
      phasesService.getPhasesObservable().subscribe(() => this.refreshPhaseOptions());
    });

    // Portfolio catalog is NOT fetched here — see `loadSecondaryFacetOptions()` below.
  }

  private refreshPhaseOptions(): void {
    this.phaseOptions.set(buildIpsrPhaseOptions(this.phasesService?.phases?.ipsr ?? []));
  }

  private getResultsApiService(): ResultsApiService {
    if (!this.resultsApiService) {
      this.resultsApiService = this.injector.get(ResultsApiService);
    }
    return this.resultsApiService;
  }

  /**
   * One-time Portfolio catalog fetch, called by the Innovation Packages page component's
   * `ngOnInit` (`IPSR-T-5`) — mirrors RC's `getClarisaPortfolios()` being called from
   * `results-list-filters.component.ts#ngOnInit`, not from a constructor. Idempotent: a second (or
   * later) call is a no-op once the first has fired, so a component that re-runs `ngOnInit` (or a
   * defensive extra call from `IPSR-T-5`) never issues a duplicate request.
   */
  loadSecondaryFacetOptions(): void {
    if (this.optionsLoaded) {
      return;
    }
    this.optionsLoaded = true;
    this.loadPortfolioOptions();
  }

  /**
   * One-time Portfolio catalog fetch — mirrors RC's `getClarisaPortfolios()` exactly (unwrapped
   * array response), including its silent-fallback error handling (`design.md` §9).
   */
  private loadPortfolioOptions(): void {
    this.getResultsApiService().GET_ClarisaPortfolios().subscribe({
      next: (response: any[]) => {
        this.portfolioOptions.set(response ?? []);
      },
      error: err => {
        console.error(err);
      }
    });
  }

  /**
   * "More filters" popover Apply — `design.md` §2.3 temp-then-apply staging, Portfolio only.
   * Copies `tempSelectedPortfolios` into `selectedPortfolios`; no other facet's state is touched.
   */
  applyFilters(): void {
    this.selectedPortfolios.set([...this.tempSelectedPortfolios()]);
  }

  /**
   * "More filters" popover Cancel — `design.md` §2.3: discards the draft edit without touching
   * `selectedPortfolios`. Resyncing `tempSelectedPortfolios` back to the current `selectedPortfolios`
   * (rather than leaving the aborted edit sitting in `temp*`) is what makes the *next* popover-open
   * already show the right state — no separate "reseed on open" method is needed here; if
   * `IPSR-T-5`'s popover-open handler wants an explicit reseed hook instead, this method's body is
   * the one to reuse/extract.
   */
  cancelFilters(): void {
    this.tempSelectedPortfolios.set([...this.selectedPortfolios()]);
  }

  /**
   * Called by `ApiService.updateUserData()` whenever `dataControlSE.myInitiativesListIPSRByPortfolio`
   * (re)loads — same method name/call-site `api.service.ts` already uses today; only the internal
   * representation changed (the `programOptions` signal, not the old chip-array).
   */
  updateMyInitiatives(initiatives: any[]): void {
    this.programOptions.set(buildIpsrProgramOptions(initiatives));
  }

  /**
   * Recomputes `statusOptions` from whatever the loaded Innovation Packages list currently holds
   * (`IPSR-DD-2`). Intended to be called by a later task's component wiring whenever
   * `ipsrDataControlSE.ipsrResultList` (re)loads (mirrors `updateMyInitiatives` above).
   */
  refreshStatusOptions(resultList: any[]): void {
    this.statusOptions.set(buildIpsrStatusOptions(resultList));
  }
}
