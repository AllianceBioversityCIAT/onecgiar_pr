import { Component, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-consensus-and-consultation',
  templateUrl: './step-n1-consensus-and-consultation.component.html',
  styleUrls: ['./step-n1-consensus-and-consultation.component.scss']
})
export class StepN1ConsensusAndConsultationComponent {
  @Input() body = new IpsrStep1Body();
  fields = [
    { idAttr: 'consensus_initiative_work_package_id', label: 'Can you confirm that there is consensus/commitment among the Initiative and Work Package leadership and partners on the proposed Innovation, country and targets', radioOptions: [] },
    { idAttr: 'relevant_country_id', label: 'Can you confirm that the relevant CGIAR country convener is aware of the proposed innovation package and scaling readiness exercise', radioOptions: [] },
    { idAttr: 'regional_leadership_id', label: 'Can you confirm that the CGIAR Regional Leadership is aware of the proposed innovation package and scaling readiness exercise', radioOptions: [] },
    { idAttr: 'regional_integrated_id', label: 'Can you confirm that the CGIAR Regional Integrated Initiative leadership is aware of the proposed innovation package and scaling readiness exercise', radioOptions: [] },
    { idAttr: 'active_backstopping_id', label: 'Would you be interested in receiving active support to ensure (gender-)responsible scaling?', radioOptions: [] }
  ];
  constructor(private api: ApiService) {
    this.getInformation();
  }
  getInformation() {
    this.api.resultsSE.getAllInnoPaConsensusInitiativeWorkPackage().subscribe(({ response }) => {
      //(response);
      this.fields[0].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaRelevantCountry().subscribe(({ response }) => {
      //(response);
      this.fields[1].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaRegionalLeadership().subscribe(({ response }) => {
      //(response);
      this.fields[2].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaRegionalIntegrated().subscribe(({ response }) => {
      //(response);
      this.fields[3].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaActiveBackstopping().subscribe(({ response }) => {
      //(response);
      this.fields[4].radioOptions = response;
    });
  }
}
