import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BilateralContextService {
  readonly centerAcronym = signal('');
  readonly centerName = signal('');

  setCenter(acronym: string, name: string): void {
    this.centerAcronym.set(acronym);
    this.centerName.set(name);
  }
}
