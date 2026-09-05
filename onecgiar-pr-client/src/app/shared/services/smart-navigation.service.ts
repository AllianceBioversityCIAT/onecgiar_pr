import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface BackTarget {
  url: string;
  label: string;
}

/** Default way out of result-detail when the origin is unknown. */
export const RESULTS_CENTER_LIST_PATH = '/result/results-outlet/results-list';

/** Visible label for the result-detail header back link (kept stable across origins). */
export const RESULT_DETAIL_BACK_LABEL = 'Back to results';

/**
 * Programme Results tab only — `/entity-details/:code/results`.
 * Must not match the sibling `results-review` route.
 */
export function isProgrammeResultsTab(url: string): boolean {
  return /\/entity-details\/[^/?#]+\/results(?:[/?#]|$)/.test(url);
}

/** My Results tab — `/entity-details/:code/my-work`. */
export function isMyResultsTab(url: string): boolean {
  return /\/entity-details\/[^/?#]+\/my-work(?:[/?#]|$)/.test(url);
}

export function isResultDetailUrl(url: string): boolean {
  return url.includes('/result/result-detail/');
}

export function isResultsCenterList(url: string): boolean {
  return url.includes('/results-outlet/results-list');
}

export function isKnownResultDetailOrigin(url: string): boolean {
  return isProgrammeResultsTab(url) || isMyResultsTab(url) || isResultsCenterList(url);
}

/** Survives the full page load from the Science Program Results tab into `/result/result-detail`. */
export const RESULT_DETAIL_ORIGIN_STORAGE_KEY = 'prms.resultDetailBackOrigin';

/** Split a stored history URL so `[routerLink]` + `[queryParams]` can consume it. */
export function splitNavUrl(url: string): { path: string; queryParams: Record<string, string> } {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return { path: url, queryParams: {} };
  const queryParams: Record<string, string> = {};
  new URLSearchParams(url.slice(qIndex + 1)).forEach((value, key) => {
    queryParams[key] = value;
  });
  return { path: url.slice(0, qIndex), queryParams };
}

/**
 * Smart navigation tracker that listens to router transitions and determines
 * the context-aware "Back" destination and human-readable label based on where the
 * user arrived from (e.g. Science Programs list, Portfolio Overview, Overview tab,
 * Bilateral center overview, Results list, etc.), with robust fallback for direct URL landings.
 */
@Injectable({ providedIn: 'root' })
export class SmartNavigationService {
  private readonly router = inject(Router, { optional: true });
  private history: string[] = [];

  constructor() {
    // The service is providedIn root but only constructed on first inject. Result-detail
    // used to be that first inject, so the NavigationEnd for the origin page had already
    // passed. Seed the in-flight / last previous URL so Back still sees the Results tab.
    const previous = this.urlFromNavigation(this.router?.getCurrentNavigation?.()?.previousNavigation)
      || this.urlFromNavigation(this.router?.lastSuccessfulNavigation?.()?.previousNavigation);
    this.trackUrl(previous);

    const current = this.sanitizeUrl(this.router?.url);
    this.trackUrl(current);

    const events$ = this.router?.events;
    if (events$ && typeof events$.pipe === 'function') {
      events$
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          const rawUrl = event.urlAfterRedirects || event.url;
          this.trackUrl(this.sanitizeUrl(rawUrl));
        });
    }
  }

  private urlFromNavigation(nav: { finalUrl?: unknown; extractedUrl?: unknown } | null | undefined): string {
    if (!nav || !this.router) return '';
    const tree = nav.finalUrl ?? nav.extractedUrl;
    if (!tree) return '';
    if (typeof tree === 'string') return this.sanitizeUrl(tree);
    if (typeof this.router.serializeUrl === 'function') {
      try {
        return this.sanitizeUrl(this.router.serializeUrl(tree as Parameters<Router['serializeUrl']>[0]));
      } catch {
        return '';
      }
    }
    return '';
  }

  private sanitizeUrl(url: string | null | undefined): string {
    return (url ?? '').trim();
  }

  private isValidHistoryUrl(url: string): boolean {
    return !!url && url !== '/' && url !== '/login' && url !== '/landing-redirect';
  }

  /** Expose history entries for testing / inspection. */
  getHistory(): string[] {
    return [...this.history];
  }

  /** Record a URL directly (useful for tests or custom synthetic steps). */
  recordUrl(url: string): void {
    this.trackUrl(this.sanitizeUrl(url));
  }

  /**
   * Persist a known result-detail origin (programme Results, My Results, or Results Center)
   * so Back still works after the full page load into `/result/result-detail`.
   */
  rememberResultDetailOrigin(url?: string): void {
    this.persistKnownOrigin(this.sanitizeUrl(url ?? this.router?.url));
  }

  /**
   * Resolves the back target (URL and descriptive label) based on current and previous URLs.
   */
  getBackTarget(currentUrl?: string, entityIdentifier?: string): BackTarget {
    const active = this.sanitizeUrl(currentUrl ?? this.router?.url);
    const code = this.extractProgramCode(active) || (entityIdentifier && entityIdentifier.startsWith('SP') ? entityIdentifier : null);
    const center = this.extractCenterAcronym(active) || entityIdentifier;

    const isDrilldown = active.includes('tocView=byAow') || active.includes('tocView=indicators');
    const isBilateralCreateOrDetail =
      active.includes('/create') || active.includes('/result/') || (active.includes('/bilateral/') && (active.includes('/create') || active.includes('/result/')));

    // 1. Science Program Drilldown (e.g. By-AOW)
    if (isDrilldown) {
      for (let i = this.history.length - 1; i >= 0; i--) {
        const prev = this.history[i];
        if (prev && prev !== active) {
          if (prev.includes('/overview')) {
            return { url: prev, label: 'Back to Overview' };
          }
          if (code && prev.includes(`/entity-details/${code}`) && !prev.includes('byAow')) {
            return { url: prev, label: 'Back to all Areas of Work' };
          }
          if (prev.includes('/portfolio-overview')) {
            return { url: prev, label: 'Back to Portfolio overview' };
          }
          if (
            prev.includes('/result-framework-reporting/home') ||
            prev === '/result-framework-reporting' ||
            prev === '/home'
          ) {
            return { url: prev, label: 'Back to Science programs' };
          }
          return { url: prev, label: 'Back' };
        }
      }

      if (code) {
        return {
          url: `/result-framework-reporting/entity-details/${code}/overview`,
          label: 'Back to Overview'
        };
      }
      return {
        url: '/result-framework-reporting/home',
        label: 'Back to Science programs'
      };
    }

    // 2. Bilateral Result Creation or Detail
    if (isBilateralCreateOrDetail || (center && (active.includes('/create') || active.includes('/result/')))) {
      for (let i = this.history.length - 1; i >= 0; i--) {
        const prev = this.history[i];
        if (prev && prev !== active) {
          if (prev.includes('/results')) {
            return { url: prev, label: 'Back to Center results' };
          }
          if (prev.includes('/drafts')) {
            return { url: prev, label: 'Back to Center drafts' };
          }
          if (center && (prev.includes(encodeURIComponent(center)) || prev.includes(center))) {
            return { url: prev, label: 'Back to Center overview' };
          }
          if (prev.includes('/bilateral')) {
            return { url: prev, label: 'Back to Centers' };
          }
          if (prev.includes('/portfolio-overview')) {
            return { url: prev, label: 'Back to Portfolio overview' };
          }
          if (prev.includes('/result-framework-reporting/home') || prev === '/home') {
            return { url: prev, label: 'Back to Science programs' };
          }
          if (prev.includes('/results-outlet/results-list')) {
            return { url: prev, label: 'Back to Results list' };
          }
          return { url: prev, label: 'Back' };
        }
      }

      if (center) {
        return {
          url: `/bilateral/${encodeURIComponent(center)}/home`,
          label: 'Back to Center overview'
        };
      }
      return {
        url: '/bilateral',
        label: 'Back to Centers'
      };
    }

    // 3. Bilateral Center Shell (Overview, Results, Drafts)
    if ((active.includes('/bilateral') || center) && !code) {
      for (let i = this.history.length - 1; i >= 0; i--) {
        const prev = this.history[i];
        if (!prev || prev === active) continue;

        const isSameCenter = center ? (prev.includes(encodeURIComponent(center)) || prev.includes(center)) : false;
        if (!isSameCenter) {
          if (prev.includes('/bilateral')) {
            return { url: prev, label: 'Back to Centers' };
          }
          if (prev.includes('/portfolio-overview')) {
            return { url: prev, label: 'Back to Portfolio overview' };
          }
          if (prev.includes('/result-framework-reporting/home') || prev === '/home') {
            return { url: prev, label: 'Back to Science programs' };
          }
          if (prev.includes('/results-outlet/results-list')) {
            return { url: prev, label: 'Back to Results list' };
          }
          return { url: prev, label: 'Back' };
        }
      }

      return {
        url: '/bilateral',
        label: 'Back to Centers'
      };
    }

    // 4. Science Program Shell (Overview, Reporting grouped, Results)
    // @akili-spec bugfix/smart-back-button
    // SBB-DD-1: skip every /entity-details/ URL in the shell branch (not just same-program)
    // so a sidebar hop to another SP never becomes the Back destination.
    for (let i = this.history.length - 1; i >= 0; i--) {
      const prev = this.history[i];
      if (!prev || prev === active) continue;

      const isEntityDetails = prev.includes('/entity-details/');
      if (!isEntityDetails) {
        if (prev.includes('/portfolio-overview')) {
          return { url: prev, label: 'Back to Portfolio overview' };
        }
        if (
          prev.includes('/result-framework-reporting/home') ||
          prev === '/result-framework-reporting' ||
          prev === '/home'
        ) {
          return { url: prev, label: 'Back to Science programs' };
        }
        if (prev.includes('/results-outlet/results-list')) {
          return { url: prev, label: 'Back to Results list' };
        }
        if (prev.includes('/results-outlet/results-notifications')) {
          return { url: prev, label: 'Back to Notifications' };
        }
        if (prev.includes('/result-detail/')) {
          return { url: prev, label: 'Back to Result' };
        }
        if (prev.includes('/bilateral')) {
          return { url: prev, label: 'Back to Bilateral results' };
        }
        if (prev.includes('/admin-module') || prev.includes('/init-admin-module')) {
          return { url: prev, label: 'Back to Admin' };
        }
        return { url: prev, label: 'Back' };
      }
    }

    // Default fallback when on main science program tabs:
    return {
      url: '/result-framework-reporting/home',
      label: 'Back to Science programs'
    };
  }

  /**
   * Navigates back to the resolved target or explicitly provided fallback URL.
   */
  back(fallbackUrl?: string, entityIdentifier?: string): void {
    if (fallbackUrl) {
      this.router?.navigateByUrl(fallbackUrl);
      return;
    }
    const target = this.getBackTarget(undefined, entityIdentifier);
    // @akili-spec bugfix/smart-back-button
    // SBB-DD-2: drop the current URL before navigating so the NavigationEnd that
    // back() itself causes cannot retarget the shell we just left on a second Back.
    const currentUrl = this.sanitizeUrl(this.router?.url);
    const lastIdx = this.history.lastIndexOf(currentUrl);
    if (lastIdx !== -1) {
      this.history.splice(lastIdx, 1);
    }
    this.router?.navigateByUrl(target.url);
  }

  /**
   * Back target for the result-detail header.
   *
   * Walks history newest-first, skipping the current URL and sibling result-detail
   * section hops (general-information → contributors, etc.). Known origins restored
   * as-is: Science Program Results, My Results, Results Center (query string kept).
   * Everything else — Overview, Reporting, QA, deep link, empty history — falls
   * back to Results Center.
   */
  getResultDetailBackTarget(currentUrl?: string): BackTarget {
    const fallback: BackTarget = { url: RESULTS_CENTER_LIST_PATH, label: RESULT_DETAIL_BACK_LABEL };
    const active = this.sanitizeUrl(currentUrl ?? this.router?.url);

    for (let i = this.history.length - 1; i >= 0; i--) {
      const prev = this.history[i];
      if (!prev || prev === active) continue;
      if (isResultDetailUrl(prev)) continue;
      if (isKnownResultDetailOrigin(prev)) {
        return { url: prev, label: RESULT_DETAIL_BACK_LABEL };
      }
      return fallback;
    }

    const persisted = this.readPersistedOrigin();
    if (persisted && persisted !== active && isKnownResultDetailOrigin(persisted)) {
      return { url: persisted, label: RESULT_DETAIL_BACK_LABEL };
    }

    return fallback;
  }

  private trackUrl(url: string): void {
    if (!url || !this.isValidHistoryUrl(url)) return;
    if (this.history[this.history.length - 1] !== url) {
      this.history.push(url);
    }
    if (this.history.length > 50) {
      this.history.shift();
    }
    this.persistKnownOrigin(url);
  }

  private persistKnownOrigin(url: string): void {
    if (!isKnownResultDetailOrigin(url)) return;
    try {
      sessionStorage.setItem(RESULT_DETAIL_ORIGIN_STORAGE_KEY, url);
    } catch {
      // Private mode / quota — memory history still works inside the same heap.
    }
  }

  private readPersistedOrigin(): string {
    try {
      return this.sanitizeUrl(sessionStorage.getItem(RESULT_DETAIL_ORIGIN_STORAGE_KEY));
    } catch {
      return '';
    }
  }

  private extractProgramCode(url: string): string | null {
    const match = url.match(/\/entity-details\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  private extractCenterAcronym(url: string): string | null {
    const match = url.match(/\/bilateral\/([^/?#]+)/);
    if (!match || match[1] === 'home') return null;
    return decodeURIComponent(match[1]);
  }
}
