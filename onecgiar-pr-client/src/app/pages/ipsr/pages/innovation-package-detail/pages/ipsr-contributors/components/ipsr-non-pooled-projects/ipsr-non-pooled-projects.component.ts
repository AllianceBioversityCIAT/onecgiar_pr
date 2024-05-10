import { Component, OnInit, Input } from '@angular/core';
import { ContributorsBody, donorInterfaceToc } from '../../model/contributorsBody';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CentersService } from '../../../../../../../../shared/services/global/centers.service';

@Component({
  selector: 'app-ipsr-non-pooled-projects',
  templateUrl: './ipsr-non-pooled-projects.component.html',
  styleUrls: ['./ipsr-non-pooled-projects.component.scss']
})
export class IpsrNonPooledProjectsComponent {
  @Input() contributorsBody = new ContributorsBody();
  constructor(public institutionsSE: InstitutionsService, public api: ApiService, public centersSE: CentersService) {}

  deleteEvidence(index) {
    //(index);
    this.contributorsBody.contributing_np_projects.splice(index, 1);
  }
  addBilateralContribution() {
    this.contributorsBody.contributing_np_projects.push(new donorInterfaceToc());
    //(this.theoryOfChangeBody.contributing_np_projects);
  }
  // requestEvent() {
  //   this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
  //     try {
  //       document.querySelector('.alert-event').addEventListener('click', e => {
  //         this.api.dataControlSE.showPartnersRequest = true;
  //       });
  //     } catch (error) { console.error(error); }
  //   });
  // }
}
