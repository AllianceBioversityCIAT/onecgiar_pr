import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BilateralContextService {
  readonly centerAcronym = signal('');
  readonly centerName = signal('');
  readonly centerId = signal<string | null>(null);

  setCenter(acronym: string, name: string, id?: string): void {
    this.centerAcronym.set(acronym);
    this.centerName.set(name);
    this.centerId.set(id ?? null);
  }
}
