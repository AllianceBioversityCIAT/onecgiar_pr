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
  constructor(private api: ApiService) {
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
}
