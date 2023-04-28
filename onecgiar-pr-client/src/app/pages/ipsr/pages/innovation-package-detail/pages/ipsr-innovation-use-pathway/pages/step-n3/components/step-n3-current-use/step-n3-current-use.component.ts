import { Component, OnInit, Input } from '@angular/core';
import { ActorN3, IpsrStep3Body, MeasureN3, OrganizationN3 } from '../../model/Ipsr-step-3-body.model';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n3-current-use',
  templateUrl: './step-n3-current-use.component.html',
  styleUrls: ['./step-n3-current-use.component.scss']
})
export class StepN3CurrentUseComponent {
  actorsTypeList = [];
  institutionsTypeTreeList = [];
  @Input() body = new IpsrStep3Body();
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
    this.body.innovatonUse.actors.push(new ActorN3());
  }
  addOrganization() {
    this.body.innovatonUse.organization.push(new OrganizationN3());
  }
  addOther() {
    this.body.innovatonUse.measures.push(new MeasureN3());
  }

  get getAllSubTypes() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      list.push({ code: resp.institution_sub_type_id });
    });
    return list;
  }
  get disableOrganizations() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
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

  executeTimer = null;
  validateYouth(i, isWomen: boolean) {
    const gender = isWomen ? 'women' : 'men';
    const genderYouth = isWomen ? 'women_youth' : 'men_youth';
    const genderNonYouth = isWomen ? 'women_non_youth' : 'men_non_youth';
    clearTimeout(this.executeTimer);
    if (this.body.innovatonUse.actors[i][genderYouth] < 0 || this.body.innovatonUse.actors[i][gender] < 0) {
      if (this.body.innovatonUse.actors[i][genderYouth] < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i][genderYouth] = null;
        }, 90);
      if (this.body.innovatonUse.actors[i][gender] < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i][gender] = 0;
        }, 90);
    }
    if (this.body.innovatonUse.actors[i][gender] - this.body.innovatonUse.actors[i][genderYouth] < 0) {
      this.executeTimer = setTimeout(() => {
        this.body.innovatonUse.actors[i][genderYouth] = this.body.innovatonUse.actors[i].previousWomen_youth;
        this.body.innovatonUse.actors[i][gender] = this.body.innovatonUse.actors[i].previousWomen;
        this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = true;
        const element: any = document.getElementById('removeFocus');
        element.focus();
        setTimeout(() => {
          this.body.innovatonUse.actors[i]['showWomenExplanation' + gender] = false;
        }, 3000);
      }, 1000);
    } else {
      this.body.innovatonUse.actors[i].previousWomen = this.body.innovatonUse.actors[i][gender];
      this.body.innovatonUse.actors[i].previousWomen_youth = this.body.innovatonUse.actors[i][genderYouth];
    }
    setTimeout(() => {
      this.body.innovatonUse.actors[i][genderNonYouth] = this.body.innovatonUse.actors[i][gender] - this.body.innovatonUse.actors[i][genderYouth];
    }, 1100);
  }
}
