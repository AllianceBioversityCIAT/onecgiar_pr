export type PlatformTourId = 'sidebar' | 'results-center' | 'where-to-report';

export const PLATFORM_TOUR_STORAGE_KEYS: Record<PlatformTourId, string> = {
  sidebar: 'pr.tour.platform.sidebar.completed',
  'results-center': 'pr.tour.platform.results-center.completed',
  'where-to-report': 'pr.tour.platform.where-to-report.completed'
};

export interface SidebarTourContext {
  hasMyPrograms: boolean;
  hasOtherPrograms: boolean;
  hasCenters: boolean;
}

export interface ResultsCenterTourContext {
  canUpdateResult: boolean;
}

export interface WtrTourContext {
  mode: 'guide-only' | 'pick-program' | 'hub';
  showPicker: boolean;
  showEmerging: boolean;
}
