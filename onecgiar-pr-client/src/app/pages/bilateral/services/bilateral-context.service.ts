import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BilateralContextService {
  readonly centerAcronym = signal('');
  readonly centerName = signal('');
  readonly centerId = signal<string | null>(null);
  // Numeric CLARISA institution id for the current center (matches
  // BilateralProject.leadCenter.id / bilateral_ai_jobs.center_id) — distinct from
  // centerId above, which holds the CLARISA center *code* (e.g. "CIMMYT").
  readonly centerInstitutionId = signal<number | null>(null);
  // @akili-spec bilateral/center-overview-tab (COV-T-2, COV-DD-2, COV-R-5 B) — the phase shared by
  // all four center tabs within a session; `null` means the Open phase. Mirrored to `?phase=` by
  // each tab, never persisted beyond the URL (no localStorage, per COV-R-5 B).
  readonly selectedVersionId = signal<number | null>(null);

  setCenter(acronym: string, name: string, id?: string, institutionId?: number | null): void {
    const centerChanged = acronym !== this.centerAcronym();
    this.centerAcronym.set(acronym);
    this.centerName.set(name);
    this.centerId.set(id ?? null);
    this.centerInstitutionId.set(institutionId ?? null);
    if (centerChanged) this.selectedVersionId.set(null);
  }
}
