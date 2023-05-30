import { Injectable } from '@angular/core';
import { AuthService } from '../api/auth.service';
import { GreenChecksService } from './green-checks.service';
import { DataControlService } from '../data-control.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  readOnly = true;
  currentInitiativeRole = null;
  roles: any;
  isAdmin = false;
  firstValidationOfReadOnly = false;
  restrictions = [
    {
      id: 1,
      description: 'Change lead and co-lead',
      roleIds: [5, 6]
    },
    {
      id: 2,
      description: 'Not able to accept/reject results from other initiatives',
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
    //(restrictionFinded);
    return Boolean(restrictionFinded.roleIds.find(roleId => roleId == this.currentInitiativeRole));
  }
  validateApplication(application) {
    this.readOnly = application?.role_id != 1;
    return { isAdmin: !this.readOnly };
  }

  async validateReadOnly(result?) {
    //('%cvalidateReadOnly', 'background: #222; color: #52cd47');
    //(result);
    if (environment?.platformIsClosed) {
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
      if (isAdmin) return null;
      if (!result) return null;
      const { initiative_id } = result;
      //(initiative_id);
      //(initiative);

      const initiativeFinded = initiative.find(init => init.initiative_id == initiative_id);
      this.readOnly = Boolean(!initiativeFinded);
      // this.readOnly ? console.log('%cIs ReadOnly => ' + this.readOnly, 'background: #222; color: #d84242') : console.log('%cNot ReadOnly => ' + this.readOnly, 'background: #222; color: #aaeaf5');
      //('%c******END OF validateReadOnly*******', 'background: #222; color: #52cd47');
      return null;
    };
    updateMyRoles(this.updateRolesListFromLocalStorage());
    updateMyRoles(this.updateRolesList());
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
          //? Update role list
          this.roles = response;
          localStorage.setItem('roles', JSON.stringify(response));
          this.getIsAdminValue();

          //?
          this.firstValidationOfReadOnly = true;
          resolve(response);
        },
        err => {
          console.log(err);
          reject();
        }
      );
    });
  }

  validateInitiative(initiative_id) {
    return !!this.roles?.initiative?.find(item => item.initiative_id == initiative_id);
  }

  //TODO App roles
  /*
  Admin
  Guest
  */

  //TODO Roles by initiative
  /*
  Lead
  Co-Lead
  Coordinator
  Member
  */
}
