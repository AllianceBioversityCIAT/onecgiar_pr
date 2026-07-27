import { TestBed } from '@angular/core/testing';

jest.mock('driver.js/dist/driver.css', () => ({}), { virtual: true });
jest.mock('driver.js', () => ({ driver: jest.fn() }));

import { driver } from 'driver.js';
import { GuideContext, ReportingGuideService, TutorialId } from './reporting-guide.service';

const driverMock = driver as unknown as jest.Mock;

interface FakeInstance {
  drive: jest.Mock;
  destroy: jest.Mock;
  config: any;
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
      const instance: FakeInstance = { drive: jest.fn(), destroy: jest.fn(), config };
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
});
