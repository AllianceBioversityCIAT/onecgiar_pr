import { Component, OnInit } from '@angular/core';
import { IpsrStep4Body } from './model/Ipsr-step-4-body.model';
import { Router } from '@angular/router';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n4',
  templateUrl: './step-n4.component.html',
  styleUrls: ['./step-n4.component.scss']
})
export class StepN4Component implements OnInit {
  ipsrStep4Body = new IpsrStep4Body();
  radioOptions = [
    { id: true, name: 'Yes' },
    { id: false, name: 'No, not necessary at this stage' }
  ];

  constructor(public ipsrDataControlSE: IpsrDataControlService, public api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Step 4');
    this.getSectionInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event-3').then(resp => {
      try {
        document.querySelector('.alert-event-3').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayStepFourByRiId().subscribe(({ response }) => {
      this.ipsrStep4Body = response;
    });
  }
  onSaveSection() {
    this.api.resultsSE.PATCHInnovationPathwayStepFourByRiId(this.ipsrStep4Body).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }

  onSavePrevious(descrip) {
    if (this.api.rolesSE.readOnly)
      return this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    this.api.resultsSE.PATCHInnovationPathwayStepFourByRiIdPrevious(this.ipsrStep4Body, descrip).subscribe(({ response }) => {
      this.getSectionInformation();
      setTimeout(() => {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }, 1000);
    });
    return null;
  }

  workshopDescription() {
    return `A template participant list can be downloaded <a href=""  class="open_route" target="_blank">here</a>`;
  }

  descriptionInnovation() {
    return `
    Are there any specific funders – other than the <a href="https://www.cgiar.org/funders/"  class="open_route" target="_blank">CGIAR Fund Donors</a> – who provide core/pooled funding – that you wish to acknowledge for their critical contribution to the continued development, testing, and scaling of this innovation?
    <ul>
    <li>Please separate funder names by a semicolon.</li>
    <li>Acknowledged funders will be included in the acknowledgment section of the Innovation Packages and Scaling Readiness report.</li>
    </ul>
    `;
  }
}
