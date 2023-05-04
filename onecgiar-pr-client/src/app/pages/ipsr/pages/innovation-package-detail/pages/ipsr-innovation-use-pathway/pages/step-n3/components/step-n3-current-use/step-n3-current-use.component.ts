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
  showWomenExplanation = false;
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
    // console.log(this.body.innovatonUse.organization);
    this.body.innovatonUse.organization.forEach(resp => {
      // console.log(resp.institution_sub_type_id);
      list.push({ code: resp.institution_sub_type_id });
    });
    // console.log(list);
    return list;
  }
  validateWomenAndYouth(i) {
    if (this.body.innovatonUse.actors[i].women_youth < 0 || this.body.innovatonUse.actors[i].women < 0) {
      if (this.body.innovatonUse.actors[i].women_youth < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i].women_youth = null;
        }, 90);
      if (this.body.innovatonUse.actors[i].women < 0)
        setTimeout(() => {
          this.body.innovatonUse.actors[i].women = 0;
        }, 90);
    }
    if (this.body.innovatonUse.actors[i].women - this.body.innovatonUse.actors[i].women_youth < 0) {
      setTimeout(() => {
        this.body.innovatonUse.actors[i].women_youth = this.body.innovatonUse.actors[i].previousWomen_youth;
        this.body.innovatonUse.actors[i].women = this.body.innovatonUse.actors[i].previousWomen;
      }, 100);

      this.showWomenExplanation = true;
      const element: any = document.getElementById('removeFocus');
      element.focus();
      setTimeout(() => {
        this.showWomenExplanation = false;
      }, 3000);
    } else {
      this.body.innovatonUse.actors[i].previousWomen = this.body.innovatonUse.actors[i].women;
      this.body.innovatonUse.actors[i].previousWomen_youth = this.body.innovatonUse.actors[i].women_youth;
    }
    setTimeout(() => {
      this.body.innovatonUse.actors[i].women_non_youth = this.body.innovatonUse.actors[i].women - this.body.innovatonUse.actors[i].women_youth;
    }, 100);
  }
}
