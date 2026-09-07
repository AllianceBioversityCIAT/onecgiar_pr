import { TestBed } from '@angular/core/testing';

jest.mock('driver.js/dist/driver.css', () => ({}), { virtual: true });
jest.mock('driver.js', () => ({ driver: jest.fn() }));

import { driver } from 'driver.js';
import { GuideContext, ReportingGuideService, SP_TOUR_STORAGE_KEY, SpTourOptions, TutorialId } from './reporting-guide.service';

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

function elementsOf(steps: any[]): string[] {
  return steps.map(s => s.element ?? null).filter(Boolean);
}

function ctx(partial: Partial<GuideContext> = {}): GuideContext {
  return {
    hasMyPrograms: false,
    hasOtherPrograms: false,
    hasSelectedProgram: false,
    hasAows: false,
    hasCategories: false,
    hasCenters: false,
    inAowView: false,
    hasIndicators: false,
    ...partial
  };
}

describe('ReportingGuideService', () => {
  let service: ReportingGuideService;

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

    TestBed.configureTestingModule({ providers: [ReportingGuideService] });
    service = TestBed.inject(ReportingGuideService);
  });

  it('exposes the four tutorials in the catalogue', () => {
    expect(service.catalogue.map(t => t.id)).toEqual(['basics', 'planned', 'emerging', 'guided']);
    service.catalogue.forEach(t => {
      expect(t.title).toBeTruthy();
      expect(t.summary).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.length).toBeTruthy();
    });
  });

  describe('start', () => {
    it('builds the driver with the shared configuration and drives it', () => {
      service.start('basics', ctx());
      expect(driverMock).toHaveBeenCalledTimes(1);
      const config = lastInstance().config;
      expect(config.showProgress).toBe(true);
      expect(config.allowClose).toBe(true);
      expect(config.disableActiveInteraction).toBe(false);
      expect(config.popoverClass).toBe('pr-guide');
      expect(lastInstance().drive).toHaveBeenCalled();
    });

    (['basics', 'planned', 'emerging', 'guided'] as TutorialId[]).forEach(id => {
      it(`builds non-empty steps for "${id}"`, () => {
        service.start(id, ctx({ hasMyPrograms: true, hasSelectedProgram: true, hasAows: true, hasCategories: true }));
        expect(lastSteps().length).toBeGreaterThan(0);
      });
    });

    it('falls back to the basics tutorial for an unknown id', () => {
      service.start('nope' as TutorialId, ctx());
      const titles = lastSteps().map(s => s.popover.title);
      expect(titles[0]).toBe('How reporting works here');
    });
  });

  describe('basics tutorial', () => {
    it('asks the user to pick from their own programs when they have some', () => {
      service.start('basics', ctx({ hasMyPrograms: true, hasOtherPrograms: true }));
      const step = lastSteps()[1];
      expect(step.element).toBe('[data-guide="my-programs"]');
      expect(step.popover.showButtons).toEqual(['close']);
    });

    it('falls back to "other programs" when the user belongs to none', () => {
      service.start('basics', ctx({ hasOtherPrograms: true }));
      expect(lastSteps()[1].element).toBe('[data-guide="other-programs"]');
    });

    it('skips the pick step entirely when there is no program at all', () => {
      service.start('basics', ctx());
      expect(elementsOf(lastSteps())).toEqual(['[data-guide="guided-entry"]']);
    });

    it('adds the planned block only when a program with AoWs is open', () => {
      service.start('basics', ctx({ hasSelectedProgram: true, hasAows: true }));
      expect(elementsOf(lastSteps())).toContain('[data-guide="planned"]');

      service.start('basics', ctx({ hasSelectedProgram: true, hasAows: false }));
      expect(elementsOf(lastSteps())).not.toContain('[data-guide="planned"]');

      service.start('basics', ctx({ hasSelectedProgram: false, hasAows: true }));
      expect(elementsOf(lastSteps())).not.toContain('[data-guide="planned"]');
    });

    it('adds the emerging block only when the open program has categories', () => {
      service.start('basics', ctx({ hasSelectedProgram: true, hasCategories: true }));
      expect(elementsOf(lastSteps())).toContain('[data-guide="emerging"]');

      service.start('basics', ctx({ hasSelectedProgram: true, hasCategories: false }));
      expect(elementsOf(lastSteps())).not.toContain('[data-guide="emerging"]');
    });

    it('adds the centers block only for users with a center role', () => {
      service.start('basics', ctx({ hasCenters: true }));
      expect(elementsOf(lastSteps())).toContain('[data-guide="centers"]');

      service.start('basics', ctx({ hasCenters: false }));
      expect(elementsOf(lastSteps())).not.toContain('[data-guide="centers"]');
    });

    it('always closes with the wrap-up stop', () => {
      service.start('basics', ctx());
      expect(lastSteps()[lastSteps().length - 1].popover.title).toBe("That's the lay of the land");
    });
  });

  describe('planned tutorial', () => {
    it('walks program → AoW when the program has Areas of Work', () => {
      service.start('planned', ctx({ hasMyPrograms: true, hasSelectedProgram: true, hasAows: true }));
      const elements = elementsOf(lastSteps());
      expect(elements).toEqual(['[data-guide="my-programs"]', '[data-guide="planned"]', '[data-guide="aow-action"]']);
    });

    it('explains the empty case when the open program has no Areas of Work', () => {
      service.start('planned', ctx({ hasSelectedProgram: true, hasAows: false }));
      const steps = lastSteps();
      expect(steps[steps.length - 1].popover.title).toBe('No Areas of Work yet');
    });

    it('stops after the intro when no program is open', () => {
      service.start('planned', ctx());
      expect(lastSteps()).toHaveLength(1);
    });

    it('describes the indicator list when inside an Area of Work with indicators', () => {
      service.start('planned', ctx({ inAowView: true, hasIndicators: true }));
      expect(elementsOf(lastSteps())).toEqual([
        '[data-guide="aow-header"]',
        '[data-guide="aow-search"]',
        '[data-guide="aow-group"]',
        '[data-guide="aow-indicator"]',
        '[data-guide="aow-report"]'
      ]);
    });

    it('skips the indicator cards when the Area of Work has none', () => {
      service.start('planned', ctx({ inAowView: true, hasIndicators: false }));
      expect(elementsOf(lastSteps())).toEqual(['[data-guide="aow-header"]', '[data-guide="aow-search"]']);
    });
  });

  describe('emerging tutorial', () => {
    it('shows the category blocks when the open program has categories', () => {
      service.start('emerging', ctx({ hasSelectedProgram: true, hasCategories: true }));
      expect(elementsOf(lastSteps())).toEqual(['[data-guide="emerging"]', '[data-guide="emerging-action"]']);
    });

    it('drops the category blocks when there are none', () => {
      service.start('emerging', ctx({ hasSelectedProgram: true, hasCategories: false }));
      expect(elementsOf(lastSteps())).toEqual([]);
      expect(lastSteps()).toHaveLength(2);
    });

    it('includes the program pick step when the user has other programs only', () => {
      service.start('emerging', ctx({ hasOtherPrograms: true }));
      expect(elementsOf(lastSteps())).toContain('[data-guide="other-programs"]');
    });
  });

  describe('guided tutorial', () => {
    it('is a fixed three-stop tour', () => {
      service.start('guided', ctx());
      expect(lastSteps()).toHaveLength(3);
      expect(elementsOf(lastSteps())).toEqual(['[data-guide="guided-entry"]']);
    });
  });

  describe('onHighlightStarted', () => {
    function highlight(element: any) {
      service.start('basics', ctx());
      lastInstance().config.onHighlightStarted(element);
    }

    function anchor(value: string | null): HTMLElement {
      const el = document.createElement('div');
      if (value !== null) el.setAttribute('data-guide', value);
      return el;
    }

    it('waits for a program when a programs anchor is highlighted', () => {
      highlight(anchor('my-programs'));
      service.notify('program-selected', ctx());
      expect(instances).toHaveLength(2);
    });

    it('waits for an Area of Work on the aow-action anchor', () => {
      highlight(anchor('aow-action'));
      service.notify('aow-opened', ctx());
      expect(instances).toHaveLength(2);
    });

    it('waits for nothing on any other anchor', () => {
      highlight(anchor('guided-entry'));
      service.notify('program-selected', ctx());
      expect(instances).toHaveLength(1);
    });

    it('tolerates a missing element and an element without the attribute', () => {
      highlight(undefined);
      expect(() => lastInstance().config.onHighlightStarted(anchor(null))).not.toThrow();
      service.notify('program-selected', ctx());
      expect(instances).toHaveLength(1);
    });
  });

  describe('notify', () => {
    function waitForPrograms() {
      service.start('basics', ctx({ hasMyPrograms: true }));
      lastInstance().config.onHighlightStarted(document.createElement('div'));
      const el = document.createElement('div');
      el.setAttribute('data-guide', 'my-programs');
      lastInstance().config.onHighlightStarted(el);
    }

    it('does nothing when the tutorial is not waiting for that event', () => {
      service.start('basics', ctx({ hasMyPrograms: true }));
      service.notify('aow-opened', ctx());
      expect(instances).toHaveLength(1);
    });

    it('rebuilds the tutorial and resumes at the marked step', () => {
      waitForPrograms();
      service.notify('program-selected', ctx({ hasMyPrograms: true, hasSelectedProgram: true, hasAows: true }));

      expect(instances).toHaveLength(2);
      expect(instances[0].destroy).toHaveBeenCalled();
      // step 0 = intro, step 1 = pick program, step 2 = "after-program" marker
      expect(lastInstance().drive).toHaveBeenCalledWith(2);
    });

    it('resumes from the beginning when there is no marker in the rebuilt steps', () => {
      waitForPrograms();
      service.notify('program-selected', ctx({ hasMyPrograms: true }));
      expect(lastInstance().drive).toHaveBeenCalledWith(0);
    });

    it('resumes after the tutorial was torn down by the page re-render', () => {
      service.start('planned', ctx({ hasMyPrograms: true, hasSelectedProgram: true, hasAows: true }));
      const el = document.createElement('div');
      el.setAttribute('data-guide', 'aow-action');
      lastInstance().config.onHighlightStarted(el);

      // The page re-renders: driver.js destroys itself and we park the intent.
      lastInstance().config.onDestroyed();

      service.notify('aow-opened', ctx({ inAowView: true, hasIndicators: true }));

      expect(instances).toHaveLength(2);
      // Only one instance existed and it was already destroyed by driver.js itself.
      expect(instances[0].destroy).not.toHaveBeenCalled();
      expect(lastInstance().drive).toHaveBeenCalledWith(0);
    });

    it('ignores a second notification once the wait was consumed', () => {
      waitForPrograms();
      service.notify('program-selected', ctx({ hasMyPrograms: true }));
      const created = instances.length;
      service.notify('program-selected', ctx({ hasMyPrograms: true }));
      expect(instances).toHaveLength(created);
    });
  });

  describe('onDestroyed', () => {
    it('clears the live instance and parks what it was waiting for', () => {
      service.start('basics', ctx({ hasMyPrograms: true }));
      const el = document.createElement('div');
      el.setAttribute('data-guide', 'my-programs');
      lastInstance().config.onHighlightStarted(el);
      lastInstance().config.onDestroyed();

      service.notify('program-selected', ctx({ hasMyPrograms: true }));
      expect(instances).toHaveLength(2);
      expect(instances[0].destroy).not.toHaveBeenCalled();
    });
  });

  describe('SP Guided Tour', () => {
    beforeEach(() => {
      localStorage.clear();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      localStorage.clear();
    });

    describe('isSpTourCompleted and resetSpTourState', () => {
      it('returns false initially when no tour flag is stored', () => {
        expect(service.isSpTourCompleted()).toBe(false);
      });

      it('returns true when SP_TOUR_STORAGE_KEY is set to "true"', () => {
        localStorage.setItem(SP_TOUR_STORAGE_KEY, 'true');
        expect(service.isSpTourCompleted()).toBe(true);
      });

      it('returns false when SP_TOUR_STORAGE_KEY has any other value', () => {
        localStorage.setItem(SP_TOUR_STORAGE_KEY, 'false');
        expect(service.isSpTourCompleted()).toBe(false);
      });

      it('resets tour state by removing key from storage', () => {
        localStorage.setItem(SP_TOUR_STORAGE_KEY, 'true');
        service.resetSpTourState();
        expect(localStorage.getItem(SP_TOUR_STORAGE_KEY)).toBeNull();
        expect(service.isSpTourCompleted()).toBe(false);
      });
    });

    describe('startSpTour', () => {
      it('initializes driver with 6 canonical steps and starts tour', () => {
        service.startSpTour({ programName: 'Breeding Resources', cycleYear: 2026 });

        expect(driverMock).toHaveBeenCalledTimes(1);
        expect(lastInstance().drive).toHaveBeenCalled();

        const steps = lastSteps();
        expect(steps).toHaveLength(7);

        // Step 0: Identity
        expect(steps[0].element).toBe('[data-guide="sp-identity"]');
        expect(steps[0].popover.title).toBe('Breeding Resources (2026)');
        expect(steps[0].popover.description).toContain('Current tab: <strong>Overview</strong>');
        expect(steps[0].popover.side).toBe('bottom');
        expect(steps[0].popover.align).toBe('start');

        // Step 1: Tabs
        expect(steps[1].element).toBe('[data-guide="sp-tabs"]');
        expect(steps[1].popover.title).toBe('Main Navigation Tabs');
        expect(steps[1].popover.description).toContain('My results');
        expect(steps[1].popover.description).toContain('Current tab: <strong>Overview</strong>');
        expect(steps[1].popover.side).toBe('bottom');
        expect(steps[1].popover.align).toBe('center');

        // Step 2: Overview
        expect(steps[2].element).toBe('[data-guide="tab-overview-view"]');
        expect(steps[2].popover.title).toBe('Overview & Burndown');
        expect(steps[2].popover.description).toContain('Current tab: <strong>Overview</strong>');
        expect(steps[2].popover.side).toBe('bottom');
        expect(steps[2].popover.align).toBe('start');

        // Step 3: Reporting
        expect(steps[3].element).toBe('[data-guide="tab-reporting-view"]');
        expect(steps[3].popover.title).toBe('Reporting by Area of Work');
        expect(steps[3].popover.description).toContain('Current tab: <strong>Reporting</strong>');
        expect(steps[3].popover.side).toBe('top');
        expect(steps[3].popover.align).toBe('start');

        // Step 4: Results
        expect(steps[4].element).toBe('[data-guide="tab-results-view"]');
        expect(steps[4].popover.title).toBe('Results Registry');
        expect(steps[4].popover.description).toContain('Current tab: <strong>Results</strong>');
        expect(steps[4].popover.side).toBe('top');
        expect(steps[4].popover.align).toBe('start');

        // Step 5: My results
        expect(steps[5].element).toBe('[data-guide="tab-my-results-view"]');
        expect(steps[5].popover.title).toBe('My Results Board');
        expect(steps[5].popover.description).toContain('Current tab: <strong>My results</strong>');
        expect(steps[5].popover.side).toBe('top');
        expect(steps[5].popover.align).toBe('start');

        // Step 6: Actions
        expect(steps[6].element).toBe('[data-guide="sp-actions-toolbar"]');
        expect(steps[6].popover.title).toBe('Filters & Quick Actions');
        expect(steps[6].popover.description).toContain('Current tab: <strong>Reporting</strong>');
        expect(steps[6].popover.side).toBe('bottom');
        expect(steps[6].popover.align).toBe('end');
      });

      it('falls back gracefully for missing programName and cycleYear', () => {
        service.startSpTour();
        const steps = lastSteps();
        expect(steps[0].popover.title).toBe('Science Program');

        service.startSpTour({ programName: 'SP01' });
        expect(lastSteps()[0].popover.title).toBe('SP01');

        service.startSpTour({ cycleYear: 2026 });
        expect(lastSteps()[0].popover.title).toBe('Science Program (2026)');
      });

      it('configures driver with required styling, progress and overlay options', () => {
        service.startSpTour();
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

      it('persists completion flag to localStorage upon onDestroyed', () => {
        service.startSpTour();
        expect(service.isSpTourCompleted()).toBe(false);

        lastInstance().config.onDestroyed();
        expect(service.isSpTourCompleted()).toBe(true);
        expect(localStorage.getItem(SP_TOUR_STORAGE_KEY)).toBe('true');
      });

      describe('onNextClick navigation pipeline', () => {
        it('advances within the same tab without invoking onTabNavigate', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          // Step 0 -> Step 1 (both overview)
          inst.drive(0);
          inst.config.onNextClick(undefined, inst.config.steps[0], { driver: inst as any, index: 0 });

          expect(onTabNavigate).not.toHaveBeenCalled();
          expect(inst.drive).toHaveBeenCalledWith(1);
        });

        it('triggers onTabNavigate and waits 100ms when crossing from overview (step 2) to reporting (step 3)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(2);
          inst.config.onNextClick(undefined, inst.config.steps[2], { driver: inst as any, index: 2 });

          expect(onTabNavigate).toHaveBeenCalledWith('reporting');
          expect(inst.drive).not.toHaveBeenCalledWith(3);

          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(3);
        });

        it('triggers onTabNavigate and waits 100ms when crossing from reporting (step 3) to results (step 4)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(3);
          inst.config.onNextClick(undefined, inst.config.steps[3], { driver: inst as any, index: 3 });

          expect(onTabNavigate).toHaveBeenCalledWith('results');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(4);
        });

        it('triggers onTabNavigate and waits 100ms when crossing from results (step 4) to my-work (step 5)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(4);
          inst.config.onNextClick(undefined, inst.config.steps[4], { driver: inst as any, index: 4 });

          expect(onTabNavigate).toHaveBeenCalledWith('my-work');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(5);
        });

        it('triggers onTabNavigate and waits 100ms when crossing from my-work (step 5) to reporting (step 6)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(5);
          inst.config.onNextClick(undefined, inst.config.steps[5], { driver: inst as any, index: 5 });

          expect(onTabNavigate).toHaveBeenCalledWith('reporting');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(6);
        });

        it('triggers onTabNavigate to overview when starting from reporting tab (step 1 -> step 2)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate, activeTab: 'reporting' });

          const inst = lastInstance();
          inst.drive(1);
          inst.config.onNextClick(undefined, inst.config.steps[1], { driver: inst as any, index: 1 });

          expect(onTabNavigate).toHaveBeenCalledWith('overview');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(2);
        });

        it('triggers onTabNavigate to overview when starting from my-work tab (step 1 -> step 2)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate, activeTab: 'my-work' });

          const inst = lastInstance();
          expect(inst.config.steps[0].popover.description).toContain('Current tab: <strong>My results</strong>');
          expect(inst.config.steps[1].popover.description).toContain('Current tab: <strong>My results</strong>');

          inst.drive(1);
          inst.config.onNextClick(undefined, inst.config.steps[1], { driver: inst as any, index: 1 });

          expect(onTabNavigate).toHaveBeenCalledWith('overview');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(2);
        });

        it('calls driver.destroy() when finishing the last step (step 6)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(6);
          inst.config.onNextClick(undefined, inst.config.steps[6], { driver: inst as any, index: 6 });

          expect(inst.destroy).toHaveBeenCalled();
          expect(onTabNavigate).not.toHaveBeenCalled();
        });

        it('handles asynchronous Promise from onTabNavigate correctly', async () => {
          const onTabNavigate = jest.fn().mockResolvedValue(undefined);
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(2);
          inst.config.onNextClick(undefined, inst.config.steps[2], { driver: inst as any, index: 2 });

          expect(onTabNavigate).toHaveBeenCalledWith('reporting');
          await Promise.resolve();
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(3);
        });
      });

      describe('onPrevClick navigation pipeline', () => {
        it('navigates back within same tab without onTabNavigate', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(1);
          inst.config.onPrevClick(undefined, inst.config.steps[1], { driver: inst as any, index: 1 });

          expect(onTabNavigate).not.toHaveBeenCalled();
          expect(inst.drive).toHaveBeenCalledWith(0);
        });

        it('triggers onTabNavigate when stepping back across tabs (step 6 reporting -> step 5 my-work)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(6);
          inst.config.onPrevClick(undefined, inst.config.steps[6], { driver: inst as any, index: 6 });

          expect(onTabNavigate).toHaveBeenCalledWith('my-work');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(5);
        });

        it('triggers onTabNavigate when stepping back across tabs (step 5 my-work -> step 4 results)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(5);
          inst.config.onPrevClick(undefined, inst.config.steps[5], { driver: inst as any, index: 5 });

          expect(onTabNavigate).toHaveBeenCalledWith('results');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(4);
        });

        it('triggers onTabNavigate when stepping back from step 3 reporting to step 2 overview', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(3);
          inst.config.onPrevClick(undefined, inst.config.steps[3], { driver: inst as any, index: 3 });

          expect(onTabNavigate).toHaveBeenCalledWith('overview');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(2);
        });

        it('triggers onTabNavigate when stepping back from step 2 overview to step 1 when started from my-work', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate, activeTab: 'my-work' });

          const inst = lastInstance();
          inst.drive(2);
          inst.config.onPrevClick(undefined, inst.config.steps[2], { driver: inst as any, index: 2 });

          expect(onTabNavigate).toHaveBeenCalledWith('my-work');
          jest.advanceTimersByTime(100);
          expect(inst.drive).toHaveBeenCalledWith(1);
        });

        it('does nothing when already on the first step (step 0)', () => {
          const onTabNavigate = jest.fn();
          service.startSpTour({ onTabNavigate });

          const inst = lastInstance();
          inst.drive(0);
          const callCount = inst.drive.mock.calls.length;
          inst.config.onPrevClick(undefined, inst.config.steps[0], { driver: inst as any, index: 0 });

          expect(onTabNavigate).not.toHaveBeenCalled();
          expect(inst.drive).toHaveBeenCalledTimes(callCount);
        });
      });

      it('calls destroy on onDoneClick', () => {
        service.startSpTour();
        const inst = lastInstance();
        inst.config.onDoneClick(undefined, inst.config.steps[6], { driver: inst as any, index: 6 });
        expect(inst.destroy).toHaveBeenCalled();
      });
    });
  });
});
