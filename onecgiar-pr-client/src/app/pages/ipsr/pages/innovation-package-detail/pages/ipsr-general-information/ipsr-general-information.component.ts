import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrGeneralInformationBody } from './model/ipsr-general-information.model';

@Component({
  selector: 'app-ipsr-general-information',
  templateUrl: './ipsr-general-information.component.html',
  styleUrls: ['./ipsr-general-information.component.scss']
})
export class IpsrGeneralInformationComponent {
  ipsrGeneralInformationBody = new IpsrGeneralInformationBody();
  constructor(private api: ApiService, public scoreSE: ScoreService, public ipsrDataControlSE: IpsrDataControlService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.ipsrDataControlSE.resultInnovationId;
    this.api.resultsSE.GETInnovationByResultId(this.ipsrDataControlSE.resultInnovationId).subscribe(({ response }) => {
      console.log(response);
      this.ipsrGeneralInformationBody = response;
      console.log(this.ipsrGeneralInformationBody.is_krs);
      this.ipsrGeneralInformationBody.is_krs = Boolean(Number(this.ipsrGeneralInformationBody.is_krs));
      console.log(this.ipsrGeneralInformationBody);
    });
  }

  onChangeKrs() {
    if (this.ipsrGeneralInformationBody.is_krs === false) this.ipsrGeneralInformationBody.is_krs = null;
  }
  onSaveSection() {
    console.log('onSaveSection');
    console.log(this.ipsrGeneralInformationBody);
    console.log(this.ipsrDataControlSE.resultInnovationId);
    this.api.resultsSE.PATCHIpsrGeneralInfo(this.ipsrGeneralInformationBody, this.ipsrDataControlSE.resultInnovationId).subscribe(
      resp => {
        console.log(resp);
        this.getSectionInformation();
        this.api.alertsFe.show({ id: 'save-button', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
      },
      err => {
        this.api.alertsFe.show({ id: 'save-button', title: 'There was an error saving the section', description: '', status: 'error', closeIn: 500 });
      }
    );
  }
}
