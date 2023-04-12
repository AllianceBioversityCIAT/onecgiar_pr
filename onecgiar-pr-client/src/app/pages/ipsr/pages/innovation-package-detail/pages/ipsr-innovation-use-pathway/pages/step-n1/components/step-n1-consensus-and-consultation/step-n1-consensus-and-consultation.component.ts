import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-consensus-and-consultation',
  templateUrl: './step-n1-consensus-and-consultation.component.html',
  styleUrls: ['./step-n1-consensus-and-consultation.component.scss']
})
export class StepN1ConsensusAndConsultationComponent {
  @Input() body = new IpsrStep1Body();
  fields = [
    { label: 'Can you confirm that there is consensus/commitment among the Initiative and Work Package leadership and partners on the proposed Innovation, country and targets', radioOptions: [] },
    { label: 'Can you confirm that the relevant CGIAR country convener is aware of the proposed innovation package and scaling readiness exercise', radioOptions: [] },
    { label: 'Can you confirm that the CGIAR Regional Leadership is aware of the proposed innovation package and scaling readiness exercise', radioOptions: [] },
    { label: 'Can you confirm that the CGIAR Regional Integrated Initiative leadership is aware of the proposed innovation package and scaling readiness exercise', radioOptions: [] },
    { label: 'Would you like to receive active backstopping to ensure (gender-) responsible scaling?', radioOptions: [] }
  ];
  constructor(private api: ApiService) {
    this.getInformation();
  }
  getInformation() {
    this.api.resultsSE.getAllInnoPaActiveBackstopping().subscribe(({ response }) => {
      // console.log(response);
      this.fields[0].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaConsensusInitiativeWorkPackage().subscribe(({ response }) => {
      // console.log(response);
      this.fields[1].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaRegionalIntegrated().subscribe(({ response }) => {
      // console.log(response);
      this.fields[2].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaRegionalLeadership().subscribe(({ response }) => {
      // console.log(response);
      this.fields[3].radioOptions = response;
    });
    this.api.resultsSE.getAllInnoPaRelevantCountry().subscribe(({ response }) => {
      // console.log(response);
      this.fields[4].radioOptions = response;
    });
  }
}
