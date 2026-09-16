// @akili-spec bilateral/guided-tour (BGT-T-1, BGT-R-2..BGT-R-6, BGT-AC-2..BGT-AC-8, BGT-DD-1, BGT-DD-2, D2, D3)
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { driver, DriveStep, Driver } from 'driver.js';

export const BILATERAL_TOUR_STORAGE_KEY = 'pr.tour.bilateral.completed';

export type BilateralTabId = 'overview' | 'reporting' | 'results' | 'drafts';

export const BILATERAL_TAB_LABELS: Record<BilateralTabId, string> = {
  overview: 'Overview',
  reporting: 'Reporting',
  results: 'Results',
  drafts: 'AI Draft Results'
};

export const BILATERAL_TAB_ROUTES: Record<BilateralTabId, string> = {
  overview: 'overview',
  reporting: 'home',
  results: 'results',
  drafts: 'drafts'
};

export function tabBadgeHtml(tabOrLabel: BilateralTabId | string): string {
  const label = BILATERAL_TAB_LABELS[tabOrLabel as BilateralTabId] ?? tabOrLabel;
  return `<span class="pr-guide-tab-badge"><span class="pr-guide-tab-dot"></span>Current tab: <strong>${label}</strong></span>`;
}

export interface BilateralTourOptions {
  centerAcronym?: string;
  centerName?: string;
  cycleYear?: number | string;
  activeTab?: BilateralTabId;
  onTabNavigate?: (tab: BilateralTabId) => void | Promise<void | boolean>;
}

@Injectable({ providedIn: 'root' })
export class BilateralTourService {
  private readonly router = inject(Router, { optional: true });
  private instance: Driver | null = null;

  isBilateralTourCompleted(): boolean {
    try {
      return localStorage.getItem(BILATERAL_TOUR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  resetBilateralTourState(): void {
    try {
      localStorage.removeItem(BILATERAL_TOUR_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  getDriverInstance(): Driver | null {
    return this.instance;
  }

  startBilateralTour(options: BilateralTourOptions = {}): void {
    this.instance?.destroy();

    const center = options.centerAcronym
      ? (options.centerName ? `${options.centerAcronym} — ${options.centerName}` : options.centerAcronym)
      : (options.centerName || 'CGIAR Center');
    const cycle = options.cycleYear ? ` (${options.cycleYear})` : '';
    const identityTitle = `${center}${cycle}`;

    const initialTab: BilateralTabId = options.activeTab ?? 'overview';

    const steps: DriveStep[] = [
      {
        element: '[data-guide="bilateral-identity"]',
        popover: {
          title: identityTitle,
          description: `${tabBadgeHtml(initialTab)}<span class="pr-guide-step-copy">Welcome to the Bilateral Center workspace. Follow this tour to learn how to monitor reporting progress, navigate bilateral projects, review submitted results, and manage AI draft results.</span>`,
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-tabs"]',
        popover: {
          title: 'Main Navigation Tabs',
          description: `${tabBadgeHtml(initialTab)}<span class="pr-guide-step-copy">Switch between Overview (KPIs and burndown charts), Reporting (bilateral projects catalog and indicator targets), Results (reported deliverables registry), and AI Draft Results (AI-extracted candidate results).</span>`,
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '[data-guide="bilateral-tab-overview"]',
        popover: {
          title: 'Overview & Burndown',
          description: `${tabBadgeHtml('overview')}<span class="pr-guide-step-copy">Monitor Center reporting progress, high-level KPI cards, and analytical burndown charts summarizing performance across projects and Science Programs.</span>`,
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-tab-reporting"]',
        popover: {
          title: 'Reporting Hub & Quick Filters',
          description: `${tabBadgeHtml('reporting')}<span class="pr-guide-step-copy">Search bilateral projects by code (e.g. B-A1080) or title, filter by top Science Programs, and toggle between Card Grid and Dense Table views.</span>`,
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-reporting-kpis"]',
        popover: {
          title: 'Reporting Overview & KPI Cards',
          description: `${tabBadgeHtml('reporting')}<span class="pr-guide-step-copy">Review project statistics at a glance. Click any card—Total Projects, individual Science Programs, or Multi-Program co-mapped projects—to instantly filter the catalog below.</span>`,
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-project-card"]',
        popover: {
          title: 'Bilateral Project Catalog & Alignment',
          description: `${tabBadgeHtml('reporting')}<span class="pr-guide-step-copy">Each project card presents key details: project code, active status, project description, and aligned CGIAR Science Programs with percentage budget allocations.</span>`,
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-project-create-result"]',
        popover: {
          title: 'Create Result Directly from Project',
          description: `${tabBadgeHtml('reporting')}<span class="pr-guide-step-copy">Click Create result on any project card to open the reporting drawer pre-linked to this project, select an aligned Science Program, and begin reporting deliverables.</span>`,
          side: 'top',
          align: 'end'
        }
      },
      {
        element: '[data-guide="bilateral-tab-results"]',
        popover: {
          title: 'Results Registry',
          description: `${tabBadgeHtml('results')}<span class="pr-guide-step-copy">Inspect submitted and in-progress bilateral results, filter by reporting phase and status, customize visible table columns, and manage result actions.</span>`,
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-tab-drafts"]',
        popover: {
          title: 'AI Draft Results',
          description: `${tabBadgeHtml('drafts')}<span class="pr-guide-step-copy">Explore candidate results extracted by AI from project technical reports, filter by project, and review or promote them into official reporting.</span>`,
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-guide="bilateral-bulk-uploader-cta"]',
        popover: {
          title: 'Bulk Results Uploader',
          description: `${tabBadgeHtml('drafts')}<span class="pr-guide-step-copy">Access the external Bulk Results Uploader tool to batch-import multiple bilateral deliverables using spreadsheet templates.</span>`,
          side: 'bottom',
          align: 'end'
        }
      }
    ];

    const stepTabs: BilateralTabId[] = [
      initialTab,
      initialTab,
      'overview',
      'reporting',
      'reporting',
      'reporting',
      'reporting',
      'results',
      'drafts',
      'drafts'
    ];

    const onNext = (_element?: Element, _step?: DriveStep, opts?: { driver: Driver; index?: number }) => {
      const d = opts?.driver ?? this.instance;
      if (!d) return;

      const currentIndex = d.getActiveIndex() ?? opts?.index ?? 0;
      if (d.isLastStep?.() || currentIndex >= steps.length - 1) {
        d.destroy();
        return;
      }

      const targetIndex = currentIndex + 1;
      const currentTab = stepTabs[currentIndex];
      const targetTab = stepTabs[targetIndex];

      if (currentTab !== targetTab) {
        this.navigateToTabAndDrive(targetTab, targetIndex, d, options);
      } else {
        d.drive(targetIndex);
      }
    };

    const onPrev = (_element?: Element, _step?: DriveStep, opts?: { driver: Driver; index?: number }) => {
      const d = opts?.driver ?? this.instance;
      if (!d) return;

      const currentIndex = d.getActiveIndex() ?? opts?.index ?? 0;
      if (currentIndex <= 0) return;

      const targetIndex = currentIndex - 1;
      const currentTab = stepTabs[currentIndex];
      const targetTab = stepTabs[targetIndex];

      if (currentTab !== targetTab) {
        this.navigateToTabAndDrive(targetTab, targetIndex, d, options);
      } else {
        d.drive(targetIndex);
      }
    };

    this.instance = driver({
      showProgress: true,
      progressText: 'Step {{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Got it',
      overlayColor: '#1e202f',
      overlayOpacity: 0.65,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'pr-guide',
      allowClose: true,
      onDestroyed: () => {
        try {
          localStorage.setItem(BILATERAL_TOUR_STORAGE_KEY, 'true');
        } catch {
          // ignore storage errors
        }
        this.instance = null;
      },
      onNextClick: onNext,
      onPrevClick: onPrev,
      onDoneClick: (_element, _step, opts) => {
        const d = opts?.driver ?? this.instance;
        d?.destroy();
      },
      steps
    });

    this.instance.drive();
  }

  private navigateToTabAndDrive(
    targetTab: BilateralTabId,
    targetIndex: number,
    d: Driver,
    options: BilateralTourOptions
  ): void {
    if (options.onTabNavigate) {
      const navResult = options.onTabNavigate(targetTab);
      if (navResult && typeof (navResult as Promise<unknown>).then === 'function') {
        (navResult as Promise<unknown>).then(() => {
          setTimeout(() => d.drive(targetIndex), 100);
        });
      } else {
        setTimeout(() => d.drive(targetIndex), 100);
      }
    } else if (this.router && options.centerAcronym) {
      const route = BILATERAL_TAB_ROUTES[targetTab];
      const navPromise = this.router.navigate(['/bilateral', options.centerAcronym, route], {
        queryParamsHandling: 'preserve'
      });
      if (navPromise && typeof navPromise.then === 'function') {
        navPromise.then(() => {
          setTimeout(() => d.drive(targetIndex), 100);
        });
      } else {
        setTimeout(() => d.drive(targetIndex), 100);
      }
    } else {
      setTimeout(() => d.drive(targetIndex), 100);
    }
  }
}
