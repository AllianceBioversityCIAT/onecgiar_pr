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

  cleanActor(actorItem) {
    actorItem.women = null;
    actorItem.women_youth = null;
    actorItem.women_non_youth = null;
    actorItem.men = null;
    actorItem.men_youth = null;
    actorItem.men_non_youth = null;
    actorItem.how_many = null;
  }

  reloadSelect(organizationItem) {
    organizationItem.hide = true;
    organizationItem.institution_sub_type_id = null;
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
    console.log(this.body.innovatonUse.measures);
  }
  get getAllSubTypes() {
    const list = [];
    this.body.innovatonUse.organization.forEach(resp => {
      list.push({ code: resp.institution_sub_type_id });
    });
    return list;
  }

  removeOther(actors) {
    return actors.filter(item => item.actor_type_id != 5);
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

  narrativeActors() {
    return `
    <ul>
    <li>
    If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use below. The numbers should reflect the expected innovation use by end of 2024.
    </li>
    <li>
    The numbers for ‘youth' and 'non-youth' equal the total number for 'Women' or 'Men’.
    </li>
    </ul>

    `;
  }
}
