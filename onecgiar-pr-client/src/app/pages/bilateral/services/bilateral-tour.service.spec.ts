// @akili-spec bilateral/guided-tour (BGT-T-1, BGT-R-2..BGT-R-6, BGT-AC-2..BGT-AC-8, BGT-DD-1, BGT-DD-2, D2, D3)
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

jest.mock('driver.js/dist/driver.css', () => ({}), { virtual: true });
jest.mock('driver.js', () => ({ driver: jest.fn() }));

import { driver } from 'driver.js';
import {
  BilateralTourService,
  BILATERAL_TAB_LABELS,
  BILATERAL_TAB_ROUTES,
  BILATERAL_TOUR_STORAGE_KEY,
  tabBadgeHtml
} from './bilateral-tour.service';

const driverMock = driver as unknown as jest.Mock;

interface FakeInstance {
  drive: jest.Mock;
  destroy: jest.Mock;
  config: any;
  getActiveIndex?: jest.Mock;
  isLastStep?: jest.Mock;
}

let instances: FakeInstance[] = [];

function lastInstance(): FakeInstance {
  return instances[instances.length - 1];
}

function lastSteps(): any[] {
  return lastInstance().config.steps;
}

describe('BilateralTourService', () => {
  let service: BilateralTourService;
  let mockRouter: { navigate: jest.Mock };

  beforeEach(() => {
    instances = [];
    driverMock.mockReset();
    driverMock.mockImplementation((config: any) => {
      let activeIndex = 0;
      const instance: FakeInstance = {
        drive: jest.fn((idx?: number) => {
          if (idx !== undefined) activeIndex = idx;
        }),
        destroy: jest.fn(),
        getActiveIndex: jest.fn(() => activeIndex),
        isLastStep: jest.fn(() => activeIndex >= (config.steps?.length ?? 1) - 1),
        config
      };
      instances.push(instance);
      return instance;
    });

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        BilateralTourService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(BilateralTourService);
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  describe('Storage & Constants', () => {
    it('exports expected storage key', () => {
      expect(BILATERAL_TOUR_STORAGE_KEY).toBe('pr.tour.bilateral.completed');
    });

    it('defines tab labels matching the 4 bilateral tabs', () => {
      expect(BILATERAL_TAB_LABELS).toEqual({
        overview: 'Overview',
        reporting: 'Reporting',
        results: 'Results',
        drafts: 'AI Draft Results'
      });
    });

    it('defines tab routes correctly mapping reporting to home', () => {
      expect(BILATERAL_TAB_ROUTES).toEqual({
        overview: 'overview',
        reporting: 'home',
        results: 'results',
        drafts: 'drafts'
      });
    });

    it('tabBadgeHtml generates valid badge markup for tab keys and string labels', () => {
      expect(tabBadgeHtml('overview')).toContain('Current tab: <strong>Overview</strong>');
      expect(tabBadgeHtml('drafts')).toContain('Current tab: <strong>AI Draft Results</strong>');
      expect(tabBadgeHtml('Custom Label')).toContain('Current tab: <strong>Custom Label</strong>');
    });

    it('isBilateralTourCompleted returns false when unset, true when set, and handles storage errors', () => {
      expect(service.isBilateralTourCompleted()).toBe(false);

      localStorage.setItem(BILATERAL_TOUR_STORAGE_KEY, 'true');
      expect(service.isBilateralTourCompleted()).toBe(true);

      localStorage.setItem(BILATERAL_TOUR_STORAGE_KEY, 'false');
      expect(service.isBilateralTourCompleted()).toBe(false);

      const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: LocalStorage denied');
      });
      expect(service.isBilateralTourCompleted()).toBe(false);
      spy.mockRestore();
    });

    it('resetBilateralTourState removes the item from localStorage and ignores errors', () => {
      localStorage.setItem(BILATERAL_TOUR_STORAGE_KEY, 'true');
      service.resetBilateralTourState();
      expect(localStorage.getItem(BILATERAL_TOUR_STORAGE_KEY)).toBeNull();

      const spy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      expect(() => service.resetBilateralTourState()).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('startBilateralTour — Configuration & Steps (BGT-R-2, BGT-R-5, BGT-R-6, Gate D3)', () => {
    it('destroys any previous driver instance when started again', () => {
      service.startBilateralTour();
      const first = lastInstance();
      expect(first.destroy).not.toHaveBeenCalled();

      service.startBilateralTour();
      expect(first.destroy).toHaveBeenCalledTimes(1);
    });

    it('initializes driver with 10 canonical steps and starts driving', () => {
      service.startBilateralTour({ centerAcronym: 'CIAT', cycleYear: 2026 });

      expect(driverMock).toHaveBeenCalledTimes(1);
      expect(lastInstance().drive).toHaveBeenCalled();

      const steps = lastSteps();
      expect(steps).toHaveLength(10);

      // Step 0: Center Identity
      expect(steps[0].element).toBe('[data-guide="bilateral-identity"]');
      expect(steps[0].popover.title).toBe('CIAT (2026)');
      expect(steps[0].popover.side).toBe('bottom');
      expect(steps[0].popover.align).toBe('start');

      // Step 1: Tabs Strip
      expect(steps[1].element).toBe('[data-guide="bilateral-tabs"]');
      expect(steps[1].popover.title).toBe('Main Navigation Tabs');
      expect(steps[1].popover.side).toBe('bottom');
      expect(steps[1].popover.align).toBe('center');

      // Step 2: Overview Hub
      expect(steps[2].element).toBe('[data-guide="bilateral-tab-overview"]');
      expect(steps[2].popover.title).toBe('Overview & Burndown');
      expect(steps[2].popover.description).toContain('Current tab: <strong>Overview</strong>');
      expect(steps[2].popover.side).toBe('bottom');

      // Step 3: Reporting Hub & Quick Filters
      expect(steps[3].element).toBe('[data-guide="bilateral-tab-reporting"]');
      expect(steps[3].popover.title).toBe('Reporting Hub & Quick Filters');
      expect(steps[3].popover.description).toContain('Current tab: <strong>Reporting</strong>');
      expect(steps[3].popover.side).toBe('bottom');

      // Step 4: Reporting KPI Cards
      expect(steps[4].element).toBe('[data-guide="bilateral-reporting-kpis"]');
      expect(steps[4].popover.title).toBe('Reporting Overview & KPI Cards');
      expect(steps[4].popover.description).toContain('Current tab: <strong>Reporting</strong>');
      expect(steps[4].popover.side).toBe('bottom');

      // Step 5: Project Card in Catalog
      expect(steps[5].element).toBe('[data-guide="bilateral-project-card"]');
      expect(steps[5].popover.title).toBe('Bilateral Project Catalog & Alignment');
      expect(steps[5].popover.description).toContain('Current tab: <strong>Reporting</strong>');
      expect(steps[5].popover.side).toBe('top');

      // Step 6: Create Result Button
      expect(steps[6].element).toBe('[data-guide="bilateral-project-create-result"]');
      expect(steps[6].popover.title).toBe('Create Result Directly from Project');
      expect(steps[6].popover.description).toContain('Current tab: <strong>Reporting</strong>');
      expect(steps[6].popover.side).toBe('top');

      // Step 7: Results Hub
      expect(steps[7].element).toBe('[data-guide="bilateral-tab-results"]');
      expect(steps[7].popover.title).toBe('Results Registry');
      expect(steps[7].popover.description).toContain('Current tab: <strong>Results</strong>');
      expect(steps[7].popover.side).toBe('top');

      // Step 8: AI Drafts Hub
      expect(steps[8].element).toBe('[data-guide="bilateral-tab-drafts"]');
      expect(steps[8].popover.title).toBe('AI Draft Results');
      expect(steps[8].popover.description).toContain('Current tab: <strong>AI Draft Results</strong>');
      expect(steps[8].popover.side).toBe('top');

      // Step 9: Bulk CTA
      expect(steps[9].element).toBe('[data-guide="bilateral-bulk-uploader-cta"]');
      expect(steps[9].popover.title).toBe('Bulk Results Uploader');
      expect(steps[9].popover.side).toBe('bottom');
      expect(steps[9].popover.align).toBe('end');
    });

    it('formats title correctly for different combinations of center info', () => {
      service.startBilateralTour();
      expect(lastSteps()[0].popover.title).toBe('CGIAR Center');

      service.startBilateralTour({ centerAcronym: 'CIMMYT' });
      expect(lastSteps()[0].popover.title).toBe('CIMMYT');

      service.startBilateralTour({
        centerAcronym: 'CIAT',
        centerName: 'International Center for Tropical Agriculture',
        cycleYear: 2026
      });
      expect(lastSteps()[0].popover.title).toBe('CIAT — International Center for Tropical Agriculture (2026)');

      service.startBilateralTour({ centerName: 'Bioversity' });
      expect(lastSteps()[0].popover.title).toBe('Bioversity');
    });

    it('configures driver with required styling, overlay, and a11y options (BGT-R-5, Gate D3)', () => {
      service.startBilateralTour();
      const config = lastInstance().config;

      expect(config.showProgress).toBe(true);
      expect(config.progressText).toBe('Step {{current}} of {{total}}');
      expect(config.nextBtnText).toBe('Next');
      expect(config.prevBtnText).toBe('Back');
      expect(config.doneBtnText).toBe('Got it');
      expect(config.overlayColor).toBe('#1e202f');
      expect(config.overlayOpacity).toBe(0.65);
      expect(config.stagePadding).toBe(6);
      expect(config.stageRadius).toBe(10);
      expect(config.popoverClass).toBe('pr-guide');
      expect(config.allowClose).toBe(true);
    });

    it('persists completion flag in localStorage on onDestroyed and nulls instance', () => {
      service.startBilateralTour();
      expect(service.isBilateralTourCompleted()).toBe(false);
      expect(service.getDriverInstance()).not.toBeNull();

      lastInstance().config.onDestroyed();
      expect(service.isBilateralTourCompleted()).toBe(true);
      expect(localStorage.getItem(BILATERAL_TOUR_STORAGE_KEY)).toBe('true');
      expect(service.getDriverInstance()).toBeNull();
    });

    it('destroys driver on onDoneClick', () => {
      service.startBilateralTour();
      const inst = lastInstance();
      inst.config.onDoneClick(undefined, undefined, { driver: inst });
      expect(inst.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cross-Tab Navigation Pipeline (BGT-R-3, Gate D2)', () => {
    it('advances immediately when target step is on the same tab', () => {
      const onTabNavigate = jest.fn();
      service.startBilateralTour({ activeTab: 'overview', onTabNavigate });

      const inst = lastInstance();
      // Step 0 -> Step 1 (both overview)
      inst.drive(0);
      inst.config.onNextClick(undefined, inst.config.steps[0], { driver: inst as any, index: 0 });

      expect(onTabNavigate).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(inst.drive).toHaveBeenCalledWith(1);
    });

    it('navigates via onTabNavigate and waits 100ms when crossing from overview (step 2) to reporting (step 3)', () => {
      const onTabNavigate = jest.fn();
      service.startBilateralTour({ activeTab: 'overview', onTabNavigate });

      const inst = lastInstance();
      inst.drive(2);
      inst.config.onNextClick(undefined, inst.config.steps[2], { driver: inst as any, index: 2 });

      expect(onTabNavigate).toHaveBeenCalledWith('reporting');
      expect(inst.drive).not.toHaveBeenCalledWith(3);

      jest.advanceTimersByTime(100);
      expect(inst.drive).toHaveBeenCalledWith(3);
    });

    it('waits for onTabNavigate Promise before setting 100ms timeout', async () => {
      let resolvePromise!: () => void;
      const navPromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });
      const onTabNavigate = jest.fn().mockReturnValue(navPromise);

      service.startBilateralTour({ activeTab: 'overview', onTabNavigate });

      const inst = lastInstance();
      inst.drive(2);
      inst.config.onNextClick(undefined, inst.config.steps[2], { driver: inst as any, index: 2 });

      expect(onTabNavigate).toHaveBeenCalledWith('reporting');
      expect(inst.drive).not.toHaveBeenCalledWith(3);

      resolvePromise();
      await Promise.resolve();

      expect(inst.drive).not.toHaveBeenCalledWith(3);
      jest.advanceTimersByTime(100);
      expect(inst.drive).toHaveBeenCalledWith(3);
    });

    it('falls back to router.navigate preserving query params when onTabNavigate is omitted (Gate D2)', async () => {
      service.startBilateralTour({
        centerAcronym: 'CIAT',
        activeTab: 'overview'
      });

      const inst = lastInstance();
      inst.drive(2);
      inst.config.onNextClick(undefined, inst.config.steps[2], { driver: inst as any, index: 2 });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bilateral', 'CIAT', 'home'], {
        queryParamsHandling: 'preserve'
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(inst.drive).toHaveBeenCalledWith(3);
    });

    it('advances on the same tab without router navigation between reporting steps (3 -> 4, 4 -> 5, 5 -> 6)', () => {
      service.startBilateralTour({ activeTab: 'reporting' });
      const inst = lastInstance();

      // Mock DOM element existence for same-tab steps
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      // Step 3 -> Step 4
      inst.drive(3);
      inst.config.onNextClick(undefined, inst.config.steps[3], { driver: inst as any, index: 3 });
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(inst.drive).toHaveBeenCalledWith(4);

      // Step 4 -> Step 5
      inst.config.onNextClick(undefined, inst.config.steps[4], { driver: inst as any, index: 4 });
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(inst.drive).toHaveBeenCalledWith(5);

      // Step 5 -> Step 6
      inst.config.onNextClick(undefined, inst.config.steps[5], { driver: inst as any, index: 5 });
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(inst.drive).toHaveBeenCalledWith(6);
    });

    it('navigates from reporting to results when clicking Next on step 6', async () => {
      service.startBilateralTour({ centerAcronym: 'CIAT', activeTab: 'reporting' });
      const inst = lastInstance();

      inst.drive(6);
      inst.config.onNextClick(undefined, inst.config.steps[6], { driver: inst as any, index: 6 });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bilateral', 'CIAT', 'results'], {
        queryParamsHandling: 'preserve'
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(inst.drive).toHaveBeenCalledWith(7);
    });

    it('navigates backwards across tabs via onPrevClick (reporting -> overview)', () => {
      const onTabNavigate = jest.fn();
      service.startBilateralTour({ activeTab: 'reporting', onTabNavigate });

      const inst = lastInstance();
      inst.drive(3);
      inst.config.onPrevClick(undefined, inst.config.steps[3], { driver: inst as any, index: 3 });

      expect(onTabNavigate).toHaveBeenCalledWith('overview');
      jest.advanceTimersByTime(100);
      expect(inst.drive).toHaveBeenCalledWith(2);
    });

    it('navigates backwards across tabs via router.navigate when onTabNavigate is omitted (results step 7 -> reporting step 6)', async () => {
      service.startBilateralTour({ centerAcronym: 'CIAT', activeTab: 'results' });

      const inst = lastInstance();
      // Step 7 (results) -> Step 6 (reporting create result)
      inst.drive(7);
      inst.config.onPrevClick(undefined, inst.config.steps[7], { driver: inst as any, index: 7 });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bilateral', 'CIAT', 'home'], {
        queryParamsHandling: 'preserve'
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(inst.drive).toHaveBeenCalledWith(6);
    });

    it('destroys driver when onNextClick is invoked on the last step (step 9)', () => {
      service.startBilateralTour({ activeTab: 'drafts' });

      const inst = lastInstance();
      inst.drive(9);
      inst.config.onNextClick(undefined, inst.config.steps[9], { driver: inst as any, index: 9 });

      expect(inst.destroy).toHaveBeenCalledTimes(1);
    });

    it('does nothing when onPrevClick is invoked at step 0', () => {
      service.startBilateralTour();

      const inst = lastInstance();
      inst.drive.mockClear();
      inst.config.onPrevClick(undefined, inst.config.steps[0], { driver: inst as any, index: 0 });

      expect(inst.drive).not.toHaveBeenCalled();
    });
  });
});
