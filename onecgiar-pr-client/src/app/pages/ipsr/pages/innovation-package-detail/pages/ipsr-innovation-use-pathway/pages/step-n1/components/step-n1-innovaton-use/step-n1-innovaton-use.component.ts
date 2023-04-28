import { Component, OnInit, Input } from '@angular/core';
import { Actor, IpsrStep1Body, Measure, Organization } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-innovaton-use',
  templateUrl: './step-n1-innovaton-use.component.html',
  styleUrls: ['./step-n1-innovaton-use.component.scss']
})
export class StepN1InnovatonUseComponent {
  actorsTypeList = [];
  institutionsTypeTreeList = [];
  @Input() body = new IpsrStep1Body();
  constructor(public api: ApiService) {
    this.GETAllActorsTypes();
    this.GETInstitutionsTypeTree();
  }

  GETAllActorsTypes() {
    this.api.resultsSE.GETAllActorsTypes().subscribe(({ response }) => {
      // console.log(response);
      this.actorsTypeList = response;
    });
  }
  GETInstitutionsTypeTree() {
    this.api.resultsSE.GETInstitutionsTypeTree().subscribe(({ response }) => {
      // console.log(response);
      // this.actorsTypeList = response;
      this.institutionsTypeTreeList = response;
    });
  }
  getInstitutionsTypeTreeChildrens(institution_types_id) {
    // console.log(institution_types_id);
    const fundedList = this.institutionsTypeTreeList.find(inst => inst.code == institution_types_id);
    // console.log(fundedList?.childrens);
    return fundedList?.childrens ?? [];
  }

  reloadSelect(organizationItem) {
    organizationItem.hide = true;
    setTimeout(() => {
      organizationItem.hide = false;
    }, 300);
  }
  addActor() {
    this.body.innovatonUse.actors.push(new Actor());
  }
  addOrganization() {
    this.body.innovatonUse.organization.push(new Organization());
  }
  addOther() {
    this.body.innovatonUse.measures.push(new Measure());
    //console.log(this.body.innovatonUse.measures);
  }
  get getAllSubTypes() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      list.push({ code: resp.institution_sub_type_id });
    });
    return list;
  }

  get disableOrganizations() {
    // console.log(this.institutionsTypeTreeList);
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      // console.log(resp);
      if (!resp.institution_sub_type_id) list.push({ code: resp.institution_types_id });
    });
    return list;
  }

  removeOrganization(organizationItem) {
    console.log(organizationItem);
    organizationItem.institution_sub_type_id = null;
    organizationItem.institution_types_id = null;
    organizationItem.is_active = false;
  }
}
