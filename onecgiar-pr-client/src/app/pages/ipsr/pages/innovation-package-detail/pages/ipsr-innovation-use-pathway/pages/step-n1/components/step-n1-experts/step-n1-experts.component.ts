import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { InstitutionsService } from 'src/app/shared/services/global/institutions.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-experts',
  templateUrl: './step-n1-experts.component.html',
  styleUrls: ['./step-n1-experts.component.scss']
})
export class StepN1ExpertsComponent {
  @Input() body = new IpsrStep1Body();
  expertExampleList = [];
  expertisesList = [];
  engagingOptions = [
    { id: 1, name: 'Yes, the group of experts is diverse' },
    { id: 2, name: 'No, the list of experts is not yet as diverse as desired and can be improved by adding the following expert groups:' }
  ];
  constructor(public rolesSE: RolesService, public institutionsSE: InstitutionsService, private api: ApiService) {
    this.GETAllInnovationPackagingExpertsExpertises();
  }
  GETAllInnovationPackagingExpertsExpertises() {
    this.api.resultsSE.GETAllInnovationPackagingExpertsExpertises().subscribe(({ response }) => {
      console.log(response);
      this.expertisesList = response;
    });
  }
  addExpert() {
    this.expertExampleList.push({});
  }
}
