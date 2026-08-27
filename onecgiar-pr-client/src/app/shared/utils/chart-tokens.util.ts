/**
 * All CSS custom properties queried for chart rendering.
 * Fenced strictly to chart ramp, brand primary, and structural neutrals.
 * Status tokens are NEVER included in chart palettes (colors.scss rule).
 */
export const CHART_TOKEN_NAMES = [
  '--pr-chart-1',
  '--pr-chart-2',
  '--pr-chart-3',
  '--pr-chart-4',
  '--pr-color-primary-300',
  '--pr-color-primary-400',
  '--pr-chart-2-muted',
  '--pr-text-secondary',
  '--pr-border'
] as const;

/**
 * CSS custom properties queried for status-keyed widgets.
 * Fenced strictly for status indicators and badges, NEVER for chart series.
 */
export const STATUS_TOKEN_NAMES = [
  '--pr-status-not-started-fg',
  '--pr-status-not-started-bg',
  '--pr-status-in-progress-fg',
  '--pr-status-in-progress-bg',
  '--pr-status-submitted-fg',
  '--pr-status-submitted-bg',
  '--pr-status-in-qa-fg',
  '--pr-status-in-qa-bg',
  '--pr-status-approved-fg',
  '--pr-status-approved-bg'
] as const;

export type ChartTokenName = (typeof CHART_TOKEN_NAMES)[number];
export type StatusTokenName = (typeof STATUS_TOKEN_NAMES)[number];

export interface ResolvedChartTokens {
  ramp: [string, string, string, string];
  primary: string;
  primaryStrong: string;
  bilateralMuted: string;
  textSecondary: string;
  border: string;
}

export interface StatusTokenPair {
  fg: string;
  bg: string;
}

export interface ResolvedStatusTokens {
  notStarted: StatusTokenPair;
  inProgress: StatusTokenPair;
  submitted: StatusTokenPair;
  inQa: StatusTokenPair;
  approved: StatusTokenPair;
}

function getStyleProperty(name: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolves chart CSS tokens from runtime DOM styles.
 * Returns empty string for any undefined token (no hex fallback permitted).
 */
export function resolveChartTokens(): ResolvedChartTokens {
  return {
    ramp: [
      getStyleProperty('--pr-chart-1'),
      getStyleProperty('--pr-chart-2'),
      getStyleProperty('--pr-chart-3'),
      getStyleProperty('--pr-chart-4')
    ],
    primary: getStyleProperty('--pr-color-primary-300'),
    primaryStrong: getStyleProperty('--pr-color-primary-400'),
    bilateralMuted: getStyleProperty('--pr-chart-2-muted'),
    textSecondary: getStyleProperty('--pr-text-secondary'),
    border: getStyleProperty('--pr-border')
  };
}

/**
 * Resolves status CSS tokens for status-keyed widgets.
 * FENCE: Status tokens must NOT be used for chart series (colors.scss rule).
 */
export function resolveStatusTokens(): ResolvedStatusTokens {
  return {
    notStarted: {
      fg: getStyleProperty('--pr-status-not-started-fg'),
      bg: getStyleProperty('--pr-status-not-started-bg')
    },
    inProgress: {
      fg: getStyleProperty('--pr-status-in-progress-fg'),
      bg: getStyleProperty('--pr-status-in-progress-bg')
    },
    submitted: {
      fg: getStyleProperty('--pr-status-submitted-fg'),
      bg: getStyleProperty('--pr-status-submitted-bg')
    },
    inQa: {
      fg: getStyleProperty('--pr-status-in-qa-fg'),
      bg: getStyleProperty('--pr-status-in-qa-bg')
    },
    approved: {
      fg: getStyleProperty('--pr-status-approved-fg'),
      bg: getStyleProperty('--pr-status-approved-bg')
    }
  };
}
