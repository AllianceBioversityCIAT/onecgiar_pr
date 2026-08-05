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

  setCenter(acronym: string, name: string, id?: string, institutionId?: number | null): void {
    this.centerAcronym.set(acronym);
    this.centerName.set(name);
    this.centerId.set(id ?? null);
    this.centerInstitutionId.set(institutionId ?? null);
  }
}
