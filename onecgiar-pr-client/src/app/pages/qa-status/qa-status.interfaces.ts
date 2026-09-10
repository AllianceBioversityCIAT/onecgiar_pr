export type QaStatusValue = 'pendiente' | 'en-progreso' | 'listo-para-pruebas' | 'done';

export interface QaStatusMetrics {
  domScansPerSecIdle?: number | string;
  tabSwitchWallClockSec?: number | string;
  blockingTimeMs?: number | string;
  [key: string]: number | string | undefined;
}

export interface QaStatusGlobalMetrics {
  before: QaStatusMetrics;
  after: QaStatusMetrics;
  summary?: string;
  testsPassing?: string;
}

/**
 * Item-level metrics may arrive either as a free-text string (e.g. a one-line
 * before/after summary) or as a keyed object. Both shapes are supported so the
 * JSON asset can stay human-friendly.
 */
export type QaStatusItemMetrics = string | QaStatusMetrics;

export interface QaStatusItem {
  id: string;
  ticket?: string;
  title: string;
  area?: string;
  status: QaStatusValue;
  whatChanged?: string;
  howToTest?: string[];
  affects?: string[];
  risks?: string[];
  metricsBefore?: QaStatusItemMetrics;
  metricsAfter?: QaStatusItemMetrics;
  screenshots?: string[];
}

export interface QaStatusBoard {
  boardTitle: string;
  boardSubtitle?: string;
  lastUpdated?: string;
  globalMetrics: QaStatusGlobalMetrics;
  items: QaStatusItem[];
  extraImprovements?: string[];
}
