import { Injectable } from '@angular/core';

const EXPAND_PREFIX = 'bp_expand_';
const EXTRA_PREFIX = 'bp_extra_';
const DEFAULT_OPEN_SECTIONS: Record<string, boolean> = {
  'general-info': true,
  contributors: false,
  geography: false,
  evidence: false,
  'type-specific': false
};

@Injectable({ providedIn: 'root' })
export class BilateralExpandableStateService {
  getExpandState(resultId: number, sectionName: string): boolean {
    try {
      const stored = localStorage.getItem(`${EXPAND_PREFIX}${resultId}_${sectionName}`);
      if (stored !== null) return stored === 'true';
    } catch {
      /* localStorage unavailable — use default */
    }
    return DEFAULT_OPEN_SECTIONS[sectionName] ?? false;
  }

  setExpandState(resultId: number, sectionName: string, isOpen: boolean): void {
    try {
      localStorage.setItem(`${EXPAND_PREFIX}${resultId}_${sectionName}`, String(isOpen));
    } catch {
      /* localStorage unavailable */
    }
  }

  getShowAllFields(resultId: number, sectionName: string): boolean {
    try {
      const stored = localStorage.getItem(`${EXTRA_PREFIX}${resultId}_${sectionName}`);
      if (stored !== null) return stored === 'true';
    } catch {
      /* localStorage unavailable — use default */
    }
    return false;
  }

  setShowAllFields(resultId: number, sectionName: string, show: boolean): void {
    try {
      localStorage.setItem(`${EXTRA_PREFIX}${resultId}_${sectionName}`, String(show));
    } catch {
      /* localStorage unavailable */
    }
  }
}
