import { inject, InjectionToken, type ValueProvider } from '@angular/core';

export interface HlmSidebarConfig {
  sidebarWidth: string;
  sidebarWidthMobile: string;
  sidebarWidthIcon: string;
  sidebarWidthMinPx: number;
  sidebarWidthMaxPx: number;
  sidebarWidthStorageKey: string;
  sidebarCookieName: string;
  sidebarCookieMaxAge: number;
  sidebarKeyboardShortcut: string;
  mobileBreakpoint: string;
  compactBreakpoint: string;
  closeMobileSidebarOnMenuButtonClick: boolean;
}

const defaultConfig: HlmSidebarConfig = {
  sidebarWidth: '16rem',
  sidebarWidthMobile: '18rem',
  sidebarWidthIcon: '3rem',
  sidebarWidthMinPx: 220,
  sidebarWidthMaxPx: 480,
  sidebarWidthStorageKey: 'sidebar_width_px',
  sidebarCookieName: 'sidebar_state',
  sidebarCookieMaxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  sidebarKeyboardShortcut: 'b',
  mobileBreakpoint: '768px',
  compactBreakpoint: '1366px',
  closeMobileSidebarOnMenuButtonClick: false
};

const HlmSidebarConfigToken = new InjectionToken<HlmSidebarConfig>('HlmSidebarConfig');

export function provideHlmSidebarConfig(config: Partial<HlmSidebarConfig>): ValueProvider {
  return { provide: HlmSidebarConfigToken, useValue: { ...defaultConfig, ...config } };
}

export function injectHlmSidebarConfig(): HlmSidebarConfig {
  return inject(HlmSidebarConfigToken, { optional: true }) ?? defaultConfig;
}
