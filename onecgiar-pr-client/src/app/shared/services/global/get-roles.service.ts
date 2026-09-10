import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

/**
 * Role levels as seeded in `role_levels`. Kept here because the User Management filters (P2-2043)
 * need to ask for a level by name from the client side.
 */
export const ROLE_LEVEL = {
  /** Admin / Guest - shown in the UI as "Platform role". */
  PLATFORM: 1,
  /** Lead / Co-Lead / Coordinator / Member, held per entity - shown as "Reporting role". */
  REPORTING: 2
} as const;

@Injectable({
  providedIn: 'root'
})
export class GetRolesService {
  /**
   * Reporting (Initiative-level) roles. Loaded at construction, as it always has been, because the
   * manage-user modal reads it straight away.
   */
  roles = signal<any[]>([]);

  /**
   * P2-2043: Platform (Application-level) roles, for the User Management filter.
   *
   * Loaded lazily by `getPlatformRoles()` rather than in the constructor: this service is provided in
   * root and is injected by screens that have no use for the platform catalogue, and firing a second
   * request at every app start for one admin screen is not worth it.
   */
  platformRoles = signal<any[]>([]);

  private platformRolesRequested = false;

  api = inject(ApiService);

  constructor() {
    this.getRoles();
  }

  getRoles() {
    this.api.resultsSE.GET_roles().subscribe(roles => {
      this.roles.set(roles.response);
    });
  }

  /** Idempotent: repeated calls do not re-request the catalogue. */
  getPlatformRoles() {
    if (this.platformRolesRequested) return;
    this.platformRolesRequested = true;

    this.api.resultsSE.GET_roles(ROLE_LEVEL.PLATFORM).subscribe({
      next: roles => this.platformRoles.set(roles?.response ?? []),
      // A failed catalogue must not leave the filter permanently unusable: allow a later retry.
      error: () => {
        this.platformRolesRequested = false;
        this.platformRoles.set([]);
      }
    });
  }
}
