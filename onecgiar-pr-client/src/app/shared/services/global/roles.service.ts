import { Injectable } from '@angular/core';
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
  isAdmin = false;
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

  constructor(private authSE: AuthService, private dataControlSE: DataControlService) {}

  fieldValidation(restrictionId) {
    const restrictionFinded = this.restrictions.find(restriction => restriction.id == restrictionId);
    return Boolean(restrictionFinded.roleIds.find(roleId => roleId == this.currentInitiativeRole));
  }
  validateApplication(application) {
    this.readOnly = application?.role_id != 1;
    return { isAdmin: !this.readOnly };
  }

  async validateReadOnly(result?) {
    if (this.platformIsClosed) {
      this.readOnly = true;
      this.updateRolesListFromLocalStorage();
      this.updateRolesList();
      return null;
    }
    const updateMyRoles = async roles => {
      if (!this.roles) await roles;
      if (!this.roles) return (this.readOnly = true);
      const { application, initiative } = this.roles;
      const { isAdmin } = this.validateApplication(application);
      if (isAdmin) return (this.access.canDdit = true);
      if (!result) return null;
      const { initiative_id } = result;

      const initiativeFinded = initiative.find(init => init.initiative_id == initiative_id);
      this.access.canDdit = Boolean(initiativeFinded);
      this.readOnly = Boolean(!initiativeFinded);
      return null;
    };
    updateMyRoles(this.updateRolesListFromLocalStorage());

    if (this.authSE.localStorageUser) {
      updateMyRoles(this.updateRolesList());
    }
  }

  getIsAdminValue() {
    this.roles?.application?.role_id == 1 ? (this.isAdmin = true) : (this.isAdmin = false);
  }

  async updateRolesListFromLocalStorage() {
    this.roles = JSON.parse(localStorage.getItem('roles'));
    this.getIsAdminValue();
    this.firstValidationOfReadOnly = true;
  }

  async updateRolesList() {
    return new Promise((resolve, reject) => {
      this.authSE.GET_allRolesByUser().subscribe(
        ({ response }) => {
          this.roles = response;
          localStorage.setItem('roles', JSON.stringify(response));
          this.getIsAdminValue();

          this.firstValidationOfReadOnly = true;
          resolve(response);
        },
        err => {
          console.error(err);
          reject();
        }
      );
    });
  }

  validateInitiative(initiative_id) {
    return !!this.roles?.initiative?.find(item => item.initiative_id == initiative_id);
  }

  accessToIPSRSubmit(initiative_id) {
    const initiativeFind = this.roles?.initiative?.find(item => item.initiative_id == initiative_id);
    if (initiativeFind?.role_id == 6 || this.dataControlSE?.currentResult?.status_id == 2) return false;
    return !!initiativeFind;
  }
}
