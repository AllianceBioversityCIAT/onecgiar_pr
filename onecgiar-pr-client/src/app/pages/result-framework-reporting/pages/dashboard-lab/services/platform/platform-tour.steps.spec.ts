import {
  buildResultsCenterTourSteps,
  buildSidebarTourSteps,
  buildWhereToReportTourSteps
} from './platform-tour.steps';
import { RC_TOUR_COPY, SIDEBAR_TOUR_COPY, WTR_TOUR_COPY } from './platform-tour-copy';

function elementsOf(steps: { element?: string }[]): string[] {
  return steps.map(s => s.element).filter((e): e is string => !!e);
}

describe('platform-tour.steps', () => {
  describe('buildSidebarTourSteps', () => {
    it('includes full sequence when all sections are present', () => {
      const steps = buildSidebarTourSteps({
        hasMyPrograms: true,
        hasOtherPrograms: true,
        hasCenters: true
      });

      expect(steps).toHaveLength(7);
      expect(elementsOf(steps)).toEqual([
        '[data-guide="platform-tour-sidebar-header"]',
        '[data-guide="platform-tour-sidebar-programs"]',
        '[data-guide="platform-tour-sidebar-other-programs"]',
        '[data-guide="platform-tour-sidebar-platform"]',
        '[data-guide="platform-tour-sidebar-results-center"]',
        '[data-guide="platform-tour-sidebar-centers"]',
        '[data-guide="sidebar-toggle"]'
      ]);
      expect(steps[0].popover?.title).toBe(SIDEBAR_TOUR_COPY.header.title);
      expect(steps[4].popover?.description).toContain(SIDEBAR_TOUR_COPY.resultsCenter.description.slice(0, 20));
    });

    it('omits optional groups when empty', () => {
      const steps = buildSidebarTourSteps({
        hasMyPrograms: false,
        hasOtherPrograms: false,
        hasCenters: false
      });

      expect(steps).toHaveLength(4);
      expect(elementsOf(steps)).toEqual([
        '[data-guide="platform-tour-sidebar-header"]',
        '[data-guide="platform-tour-sidebar-platform"]',
        '[data-guide="platform-tour-sidebar-results-center"]',
        '[data-guide="sidebar-toggle"]'
      ]);
    });
  });

  describe('buildResultsCenterTourSteps', () => {
    it('includes update step when enabled', () => {
      const steps = buildResultsCenterTourSteps({ canUpdateResult: true });
      expect(steps).toHaveLength(6);
      expect(elementsOf(steps)).toContain('[data-guide="platform-tour-rc-update"]');
      expect(steps[1].popover?.title).toBe(RC_TOUR_COPY.whereToReport.title);
    });

    it('omits update step when disabled', () => {
      const steps = buildResultsCenterTourSteps({ canUpdateResult: false });
      expect(steps).toHaveLength(5);
      expect(elementsOf(steps)).not.toContain('[data-guide="platform-tour-rc-update"]');
    });
  });

  describe('buildWhereToReportTourSteps', () => {
    it('includes picker and emerging in pick-program mode', () => {
      const steps = buildWhereToReportTourSteps({
        mode: 'pick-program',
        showPicker: true,
        showEmerging: true
      });

      expect(steps).toHaveLength(5);
      expect(elementsOf(steps)).toEqual([
        '[data-guide="platform-tour-wtr-intro"]',
        '[data-guide="platform-tour-wtr-picker"]',
        '[data-guide="platform-tour-wtr-w12"]',
        '[data-guide="platform-tour-wtr-w3"]',
        '[data-guide="platform-tour-wtr-emerging"]'
      ]);
      expect(steps[2].popover?.title).toBe(WTR_TOUR_COPY.w12.title);
    });

    it('omits picker and emerging when not applicable', () => {
      const steps = buildWhereToReportTourSteps({
        mode: 'hub',
        showPicker: false,
        showEmerging: false
      });

      expect(steps).toHaveLength(3);
      expect(elementsOf(steps)).toEqual([
        '[data-guide="platform-tour-wtr-intro"]',
        '[data-guide="platform-tour-wtr-w12"]',
        '[data-guide="platform-tour-wtr-w3"]'
      ]);
    });
  });
});
