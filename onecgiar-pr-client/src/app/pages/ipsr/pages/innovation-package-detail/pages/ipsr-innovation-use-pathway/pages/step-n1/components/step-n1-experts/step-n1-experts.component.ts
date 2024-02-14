/* eslint-disable arrow-parens */
import { Component, Input } from '@angular/core';
import { Expert, IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-experts',
  templateUrl: './step-n1-experts.component.html',
  styleUrls: ['./step-n1-experts.component.scss']
})
export class StepN1ExpertsComponent {
  @Input() body = new IpsrStep1Body();
  expertisesList = [];
  engagingOptions = [
    { id: true, name: 'Yes, the group of experts is diverse' },
    { id: false, name: 'No, the list of experts is not yet as diverse as desired and can be improved by adding the following expert groups:' }
  ];

  constructor(public rolesSE: RolesService, public institutionsSE: InstitutionsService, private api: ApiService) {
    this.GETAllInnovationPackagingExpertsExpertises();
  }

  GETAllInnovationPackagingExpertsExpertises() {
    this.api.resultsSE.GETAllInnovationPackagingExpertsExpertises().subscribe(({ response }) => {
      this.expertisesList = response;
    });
  }
  addExpert() {
    this.body.experts.push(new Expert());
  }

  hasElementsWithId(list, attr) {
    const finalList = this.api.rolesSE.readOnly ? list.filter(item => item[attr]) : list.filter(item => item.is_active != false);
    return finalList.length;
  }

  narrativeActors() {
    return `
    <ul>
    <li>
    An IPSR expert workshop should have around 25 experts, confirmed through RSVPs to maintain a manageable group size.
    </li>
    <li>
    To design a realistic innovation package, the engagement of a diverse group of experts is recommended. Please consider the following scaling expertises when developing the invitee list for the innovation packaging and scaling readiness assessment workshop</li>
    </ul>
    `;
  }
}
