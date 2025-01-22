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
  disabledOptionsPartners = [];

  constructor(
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    private router: Router
  ) {}

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

      this.disabledOptionsPartners = this.ipsrStep4Body.institutions_expected_investment.map(item => ({
        institutions_id: item?.obj_result_institution?.institutions_id
      }));
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
}
