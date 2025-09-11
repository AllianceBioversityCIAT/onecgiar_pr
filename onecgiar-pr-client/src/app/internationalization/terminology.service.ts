// terminology.service.ts
import { Injectable } from '@angular/core';
import { LEGACY_TERMS, NEW_TERMS, TermKey } from './terminology.config';

@Injectable({ providedIn: 'root' })
export class TerminologyService {
  private getActiveDict(portfolioAcronym: string) {
    if (portfolioAcronym == null) return LEGACY_TERMS;

    const y = portfolioAcronym;
    return y === 'P25' ? NEW_TERMS : LEGACY_TERMS;
  }

  t(key: TermKey, portfolioAcronym: string): string {
    const dict = this.getActiveDict(portfolioAcronym);
    return dict[key] ?? key;
  }
}
