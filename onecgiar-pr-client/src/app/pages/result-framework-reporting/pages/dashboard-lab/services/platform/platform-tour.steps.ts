import { DriveStep } from 'driver.js';
import {
  platformStepDescription,
  RC_TOUR_COPY,
  SIDEBAR_TOUR_COPY,
  WTR_TOUR_COPY
} from './platform-tour-copy';
import {
  ResultsCenterTourContext,
  SidebarTourContext,
  WtrTourContext
} from './platform-tour.types';

function sidebarStep(
  element: string,
  copy: (typeof SIDEBAR_TOUR_COPY)[keyof typeof SIDEBAR_TOUR_COPY],
  side: 'bottom' | 'top' | 'left' | 'right' = 'right'
): DriveStep {
  return {
    element,
    popover: {
      title: copy.title,
      description: platformStepDescription('Sidebar', copy.description, copy.locationHint),
      side,
      align: 'start'
    }
  };
}

function rcStep(
  element: string,
  copy: (typeof RC_TOUR_COPY)[keyof typeof RC_TOUR_COPY],
  side: 'bottom' | 'top' | 'left' | 'right' = 'bottom'
): DriveStep {
  return {
    element,
    popover: {
      title: copy.title,
      description: platformStepDescription('Results Center', copy.description, copy.locationHint),
      side,
      align: 'start'
    }
  };
}

function wtrStep(
  element: string,
  copy: (typeof WTR_TOUR_COPY)[keyof typeof WTR_TOUR_COPY],
  side: 'bottom' | 'top' | 'left' | 'right' = 'bottom'
): DriveStep {
  return {
    element,
    popover: {
      title: copy.title,
      description: platformStepDescription('Where to report', copy.description, copy.locationHint),
      side,
      align: 'start'
    }
  };
}

export function buildSidebarTourSteps(ctx: SidebarTourContext): DriveStep[] {
  const steps: DriveStep[] = [
    sidebarStep('[data-guide="platform-tour-sidebar-header"]', SIDEBAR_TOUR_COPY.header)
  ];

  if (ctx.hasMyPrograms) {
    steps.push(sidebarStep('[data-guide="platform-tour-sidebar-programs"]', SIDEBAR_TOUR_COPY.programs));
  }

  if (ctx.hasOtherPrograms) {
    steps.push(
      sidebarStep('[data-guide="platform-tour-sidebar-other-programs"]', SIDEBAR_TOUR_COPY.otherPrograms)
    );
  }

  steps.push(sidebarStep('[data-guide="platform-tour-sidebar-platform"]', SIDEBAR_TOUR_COPY.platform));
  steps.push(
    sidebarStep('[data-guide="platform-tour-sidebar-results-center"]', SIDEBAR_TOUR_COPY.resultsCenter)
  );

  if (ctx.hasCenters) {
    steps.push(sidebarStep('[data-guide="platform-tour-sidebar-centers"]', SIDEBAR_TOUR_COPY.centers));
  }

  steps.push(sidebarStep('[data-guide="sidebar-toggle"]', SIDEBAR_TOUR_COPY.collapse));

  return steps;
}

export function buildResultsCenterTourSteps(ctx: ResultsCenterTourContext): DriveStep[] {
  const steps: DriveStep[] = [
    rcStep('[data-guide="platform-tour-rc-hero"]', RC_TOUR_COPY.hero, 'bottom'),
    rcStep('[data-guide="platform-tour-rc-where-to-report"]', RC_TOUR_COPY.whereToReport, 'bottom'),
    rcStep('[data-guide="platform-tour-rc-filters"]', RC_TOUR_COPY.filters, 'bottom'),
    rcStep('[data-guide="platform-tour-rc-export"]', RC_TOUR_COPY.export, 'bottom'),
    rcStep('[data-guide="platform-tour-rc-table"]', RC_TOUR_COPY.table, 'top')
  ];

  if (ctx.canUpdateResult) {
    steps.push(rcStep('[data-guide="platform-tour-rc-update"]', RC_TOUR_COPY.update, 'bottom'));
  }

  return steps;
}

export function buildWhereToReportTourSteps(ctx: WtrTourContext): DriveStep[] {
  const steps: DriveStep[] = [wtrStep('[data-guide="platform-tour-wtr-intro"]', WTR_TOUR_COPY.intro, 'bottom')];

  if (ctx.showPicker) {
    steps.push(wtrStep('[data-guide="platform-tour-wtr-picker"]', WTR_TOUR_COPY.picker, 'bottom'));
  }

  steps.push(wtrStep('[data-guide="platform-tour-wtr-w12"]', WTR_TOUR_COPY.w12, 'bottom'));
  steps.push(wtrStep('[data-guide="platform-tour-wtr-w3"]', WTR_TOUR_COPY.w3, 'bottom'));

  if (ctx.showEmerging) {
    steps.push(wtrStep('[data-guide="platform-tour-wtr-emerging"]', WTR_TOUR_COPY.emerging, 'bottom'));
  }

  return steps;
}
