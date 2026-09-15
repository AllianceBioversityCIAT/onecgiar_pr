// @akili-spec bilateral/center-overview-tab (COV-T-3, COV-R-17, COV-R-21, COV-DD-8)
import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { BilateralCenterResult } from './bilateral-center-result.interface';
import { BilateralProject } from './bilateral-creation.interfaces';

type OverviewCacheKey = string;

function overviewCacheKey(centerId: string, versionId: number): OverviewCacheKey {
  return `${centerId}::${versionId}`;
}

/**
 * Combined snapshot exposed to the page (`COV-T-5`): the two upstream calls are decoupled
 * (`COV-R-17`), so a results failure leaves a successfully-loaded `projects` readable (and the
 * card can render "0 of N") and vice-versa — never `null` just because the OTHER stream failed.
 */
export interface BilateralOverviewEntry {
  results: BilateralCenterResult[] | null;
  projects: BilateralProject[] | null;
  resultsError: string | null;
  projectsError: string | null;
  loading: boolean;
}

/**
 * Data service for the Bilateral Center Overview tab (`COV-DD-8`). Results are cached per
 * `centerId::versionId`; projects are cached per center and fetched at most once — the two
 * streams are fetched and cached **independently** (`COV-R-17`: "results call fails AND projects
 * call succeeds" must leave the projects list readable). A late response is stored under its OWN
 * key only — the render side reads whichever key it currently cares about, so a stale response
 * for a key the user has navigated away from never overwrites the key that IS being rendered (the
 * `overview-phase-filter` race guard, `COV-DD-8`). Drafts are intentionally NOT fetched here —
 * read from `BilateralAiService.draftList()` by the page (`COV-R-22`).
 */
@Injectable({ providedIn: 'root' })
export class BilateralOverviewService {
  private readonly bilateralApi = inject(BilateralApiService);

  private readonly resultsCache = new Map<OverviewCacheKey, BilateralCenterResult[]>();
  private readonly resultsInFlight = new Set<OverviewCacheKey>();
  private readonly resultsDataSignals = new Map<OverviewCacheKey, WritableSignal<BilateralCenterResult[] | null>>();
  private readonly resultsLoadingSignals = new Map<OverviewCacheKey, WritableSignal<boolean>>();
  private readonly resultsErrorSignals = new Map<OverviewCacheKey, WritableSignal<string | null>>();

  private readonly projectsCache = new Map<string, BilateralProject[]>();
  private readonly projectsInFlight = new Set<string>();
  private readonly projectsDataSignals = new Map<string, WritableSignal<BilateralProject[] | null>>();
  private readonly projectsLoadingSignals = new Map<string, WritableSignal<boolean>>();
  private readonly projectsErrorSignals = new Map<string, WritableSignal<string | null>>();

  resultsData(centerId: string, versionId: number): Signal<BilateralCenterResult[] | null> {
    return this.resultsDataSignal(overviewCacheKey(centerId, versionId));
  }

  resultsLoading(centerId: string, versionId: number): Signal<boolean> {
    return this.resultsLoadingSignal(overviewCacheKey(centerId, versionId));
  }

  resultsError(centerId: string, versionId: number): Signal<string | null> {
    return this.resultsErrorSignal(overviewCacheKey(centerId, versionId));
  }

  projectsData(centerId: string): Signal<BilateralProject[] | null> {
    return this.projectsDataSignal(centerId);
  }

  projectsLoading(centerId: string): Signal<boolean> {
    return this.projectsLoadingSignal(centerId);
  }

  projectsError(centerId: string): Signal<string | null> {
    return this.projectsErrorSignal(centerId);
  }

  /**
   * Convenience combined view for the page: independent results/projects state for one
   * `centerId::versionId`, reactive (a `computed` over the two underlying signal pairs).
   */
  entry(centerId: string, versionId: number): Signal<BilateralOverviewEntry> {
    const key = overviewCacheKey(centerId, versionId);
    const resultsData = this.resultsDataSignal(key);
    const resultsLoading = this.resultsLoadingSignal(key);
    const resultsError = this.resultsErrorSignal(key);
    const projectsData = this.projectsDataSignal(centerId);
    const projectsLoading = this.projectsLoadingSignal(centerId);
    const projectsError = this.projectsErrorSignal(centerId);

    return computed(() => ({
      results: resultsData(),
      projects: projectsData(),
      resultsError: resultsError(),
      projectsError: projectsError(),
      loading: resultsLoading() || projectsLoading(),
    }));
  }

  /**
   * Fetches results for `centerId::versionId` and projects for `centerId`, independently. Each
   * stream is a no-op when already cached or already in flight — a results failure does not
   * prevent projects from loading, and does not clear an already-cached projects list.
   */
  load(centerId: string, versionId: number): void {
    this.loadResults(centerId, versionId);
    this.loadProjects(centerId);
  }

  /**
   * Retries whichever stream(s) need it for this key (Retry, `COV-R-17`): results are always
   * cleared and refetched (they are the versioned resource the user is looking at); projects are
   * cleared and refetched ONLY if they previously errored — a cached, successful projects list is
   * never refetched just because results failed.
   */
  invalidate(centerId: string, versionId: number): void {
    const resultsKey = overviewCacheKey(centerId, versionId);
    this.resultsCache.delete(resultsKey);
    this.resultsInFlight.delete(resultsKey);
    this.resultsDataSignal(resultsKey).set(null);
    this.resultsErrorSignal(resultsKey).set(null);

    if (this.projectsErrorSignal(centerId)() !== null) {
      this.projectsCache.delete(centerId);
      this.projectsInFlight.delete(centerId);
      this.projectsDataSignal(centerId).set(null);
      this.projectsErrorSignal(centerId).set(null);
    }

    this.loadResults(centerId, versionId);
    this.loadProjects(centerId);
  }

  private loadResults(centerId: string, versionId: number): void {
    const key = overviewCacheKey(centerId, versionId);
    if (this.resultsCache.has(key) || this.resultsInFlight.has(key)) return;

    this.resultsInFlight.add(key);
    this.resultsLoadingSignal(key).set(true);
    this.resultsErrorSignal(key).set(null);

    this.bilateralApi
      .GET_bilateralCenterResults(centerId, versionId)
      .pipe(map((envelope: any) => (envelope?.response ?? []) as BilateralCenterResult[]))
      .subscribe({
        next: results => {
          this.resultsCache.set(key, results);
          this.resultsDataSignal(key).set(results);
          this.resultsLoadingSignal(key).set(false);
          this.resultsInFlight.delete(key);
        },
        error: () => {
          this.resultsErrorSignal(key).set('The results could not be loaded.');
          this.resultsLoadingSignal(key).set(false);
          this.resultsInFlight.delete(key);
        },
      });
  }

  private loadProjects(centerId: string): void {
    if (this.projectsCache.has(centerId) || this.projectsInFlight.has(centerId)) return;

    this.projectsInFlight.add(centerId);
    this.projectsLoadingSignal(centerId).set(true);
    this.projectsErrorSignal(centerId).set(null);

    this.bilateralApi
      .GET_bilateralProjects(centerId)
      .pipe(map((envelope: any) => (envelope?.response?.projects ?? envelope?.response ?? []) as BilateralProject[]))
      .subscribe({
        next: projects => {
          this.projectsCache.set(centerId, projects);
          this.projectsDataSignal(centerId).set(projects);
          this.projectsLoadingSignal(centerId).set(false);
          this.projectsInFlight.delete(centerId);
        },
        error: () => {
          this.projectsErrorSignal(centerId).set('The projects could not be loaded.');
          this.projectsLoadingSignal(centerId).set(false);
          this.projectsInFlight.delete(centerId);
        },
      });
  }

  private resultsDataSignal(key: OverviewCacheKey): WritableSignal<BilateralCenterResult[] | null> {
    let existing = this.resultsDataSignals.get(key);
    if (!existing) {
      existing = signal<BilateralCenterResult[] | null>(this.resultsCache.get(key) ?? null);
      this.resultsDataSignals.set(key, existing);
    }
    return existing;
  }

  private resultsLoadingSignal(key: OverviewCacheKey): WritableSignal<boolean> {
    let existing = this.resultsLoadingSignals.get(key);
    if (!existing) {
      existing = signal(false);
      this.resultsLoadingSignals.set(key, existing);
    }
    return existing;
  }

  private resultsErrorSignal(key: OverviewCacheKey): WritableSignal<string | null> {
    let existing = this.resultsErrorSignals.get(key);
    if (!existing) {
      existing = signal<string | null>(null);
      this.resultsErrorSignals.set(key, existing);
    }
    return existing;
  }

  private projectsDataSignal(centerId: string): WritableSignal<BilateralProject[] | null> {
    let existing = this.projectsDataSignals.get(centerId);
    if (!existing) {
      existing = signal<BilateralProject[] | null>(this.projectsCache.get(centerId) ?? null);
      this.projectsDataSignals.set(centerId, existing);
    }
    return existing;
  }

  private projectsLoadingSignal(centerId: string): WritableSignal<boolean> {
    let existing = this.projectsLoadingSignals.get(centerId);
    if (!existing) {
      existing = signal(false);
      this.projectsLoadingSignals.set(centerId, existing);
    }
    return existing;
  }

  private projectsErrorSignal(centerId: string): WritableSignal<string | null> {
    let existing = this.projectsErrorSignals.get(centerId);
    if (!existing) {
      existing = signal<string | null>(null);
      this.projectsErrorSignals.set(centerId, existing);
    }
    return existing;
  }
}
