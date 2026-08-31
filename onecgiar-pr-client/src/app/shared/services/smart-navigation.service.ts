import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface BackTarget {
  url: string;
  label: string;
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
    const current = this.sanitizeUrl(this.router?.url);
    if (current && this.isValidHistoryUrl(current)) {
      this.history.push(current);
    }

    const events$ = this.router?.events;
    if (events$ && typeof events$.pipe === 'function') {
      events$
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          const rawUrl = event.urlAfterRedirects || event.url;
          const url = this.sanitizeUrl(rawUrl);
          if (url && this.isValidHistoryUrl(url) && this.history[this.history.length - 1] !== url) {
            this.history.push(url);
          }
          if (this.history.length > 50) {
            this.history.shift();
          }
        });
    }
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
    const sanitized = this.sanitizeUrl(url);
    if (sanitized && this.isValidHistoryUrl(sanitized) && this.history[this.history.length - 1] !== sanitized) {
      this.history.push(sanitized);
    }
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
    for (let i = this.history.length - 1; i >= 0; i--) {
      const prev = this.history[i];
      if (!prev || prev === active) continue;

      const isSameProgram = code ? prev.includes(`/entity-details/${code}`) : false;
      if (!isSameProgram) {
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
    this.router?.navigateByUrl(target.url);
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
