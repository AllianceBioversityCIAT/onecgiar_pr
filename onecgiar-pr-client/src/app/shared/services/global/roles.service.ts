import { Injectable, signal } from '@angular/core';
import { AuthService } from '../api/auth.service';
import { DataControlService } from '../data-control.service';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  platformIsClosed = false;
  readOnly = true;
  currentInitiativeRole = null;
  roles: any;
  private readonly isAdminState = signal(false);
  firstValidationOfReadOnly = false;
  access = {
    canDdit: false
  };
  restrictions = [
    {
      id: 1,
      description: 'Change lead and co-lead',
      roleIds: [5, 6]
    },
    {
      id: 2,
      description: 'Not able to accept/reject results from other Initiatives',
      roleIds: [6]
    },
    {
      id: 3,
      description: 'Not able to submit/un-submit results',
      roleIds: [6]
    }
  ];

  constructor(
    private readonly authSE: AuthService,
    private readonly dataControlSE: DataControlService
  ) {}

  get isAdmin(): boolean {
    return this.isAdminState();
  }

  set isAdmin(value: boolean) {
    this.isAdminState.set(value);
  }

  fieldValidation(restrictionId) {
    const restrictionFinded = this.restrictions.find(restriction => restriction.id == restrictionId);
    return Boolean(restrictionFinded.roleIds.some(roleId => roleId == this.currentInitiativeRole));
  }

  validateApplication(application) {
    this.readOnly = application?.role_id != 1;
    this.isAdminState.set(application?.role_id == 1);
    return { isAdmin: !this.readOnly };
  }

  applyRolesResponse(response: any) {
    if (!response) return;
    this.roles = response;
    localStorage.setItem('roles', JSON.stringify(response));
    const { isAdmin } = this.validateApplication(response.application);
    if (isAdmin) {
      this.access.canDdit = true;
    }
  }

  async validateReadOnly(result?) {
    try {
      if (this.platformIsClosed) {
        this.readOnly = true;
        await this.updateRolesListFromLocalStorage();
        if (this.authSE.localStorageUser) {
          try {
            await this.updateRolesList();
          } catch {
            // Keep cached roles from localStorage when refresh fails.
          }
        }
        return null;
      }

      await this.updateRolesListFromLocalStorage();
      if (this.authSE.localStorageUser) {
        try {
          await this.updateRolesList();
        } catch {
          // Keep cached roles from localStorage when refresh fails.
        }
      }

      if (!this.roles) {
        this.readOnly = true;
        this.isAdminState.set(false);
        return null;
      }

      const { application, initiative } = this.roles;
      const { isAdmin } = this.validateApplication(application);
      if (isAdmin) {
        this.access.canDdit = true;
        return null;
      }
      if (!result) return null;
      const { initiative_id } = result;

      const initiativeFinded = (initiative ?? []).some(init => init.initiative_id == initiative_id);
      this.access.canDdit = Boolean(initiativeFinded);
      this.readOnly = Boolean(!initiativeFinded);
      return null;
    } finally {
      // Unblocks router-outlet on login and other unauthenticated routes.
      this.firstValidationOfReadOnly = true;
    }
  }

  getIsAdminValue() {
    this.isAdminState.set(this.roles?.application?.role_id == 1);
  }

  async updateRolesListFromLocalStorage() {
    const stored = localStorage.getItem('roles');
    if (!stored) return;

    try {
      this.roles = JSON.parse(stored);
      this.getIsAdminValue();
      this.firstValidationOfReadOnly = true;
    } catch {
      // Ignore corrupt cached roles; API refresh will repopulate.
    }
  }

  async updateRolesList() {
    return new Promise((resolve, reject) => {
      this.authSE.GET_allRolesByUser().subscribe({
        next: ({ response }) => {
          this.applyRolesResponse(response);
          this.firstValidationOfReadOnly = true;
          resolve(response);
        },
        error: err => {
          console.error(err);
          reject(err);
        }
      });
    });
  }

  validateInitiative(initiative_id) {
    return !!this.roles?.initiative?.find(item => item.initiative_id == initiative_id);
  }

  /**
   * Center User assignments from GET role-by-user/get/user/:id (center[]).
   * Product note: submit/QA rules for bilateral center-owned results and external-user
   * center assignment policy are pending product confirmation (P2-3100+).
   */
  getMyCenters() {
    return this.roles?.center ?? [];
  }

  validateCenterAccess(centerId: string) {
    if (this.isAdmin) return true;
    return !!this.roles?.center?.find(item => item.center_id === centerId);
  }

  accessToIPSRSubmit(initiative_id) {
    const initiativeFind = this.roles?.initiative?.find(item => item.initiative_id == initiative_id);
    if (initiativeFind?.role_id == 6 || this.dataControlSE?.currentResult?.status_id == 2) return false;
    return !!initiativeFind;
  }
}
