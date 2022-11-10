import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  readOnly = false;
  currentInitiativeRole = null;
  roles: any;
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

  fieldValidation(restrictionId) {
    const restrictionFinded = this.restrictions.find(restriction => restriction.id == restrictionId);
    console.log(restrictionFinded);
    return Boolean(restrictionFinded.roleIds.find(roleId => roleId == this.currentInitiativeRole));
  }

  validateReadOnly(result) {
    // const { application, initiative } = this.roles;
    // application.role_id = 1;
    // this.readOnly = application?.role_id != 1;
    // console.log(this.readOnly);
    this.readOnly = false;
    // const initiativeFinded = initiative.find(init => init.initiative_id == 7);
    // this.readOnly = Boolean(initiativeFinded);
    // this.currentInitiativeRole = initiativeFinded?.role_id;
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

  constructor() {}
}
