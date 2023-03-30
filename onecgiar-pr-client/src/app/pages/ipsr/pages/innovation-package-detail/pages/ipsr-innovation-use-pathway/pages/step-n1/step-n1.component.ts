import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body, CoreResult } from './model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';

@Component({
  selector: 'app-step-n1',
  templateUrl: './step-n1.component.html',
  styleUrls: ['./step-n1.component.scss']
})
export class StepN1Component implements OnInit {
  ipsrStep1Body = new IpsrStep1Body();
  coreResult = new CoreResult();
  constructor(private api: ApiService, public ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByStepOneResultId().subscribe(({ response }) => {
      console.log(response);
      this.ipsrStep1Body = response;
      this.coreResult = response?.coreResult;
      console.log(this.coreResult);
    });
  }
  onSaveSection() {
    this.api.resultsSE.PATCHInnovationPathwayByStepOneResultId({}).subscribe(resp => {
      // console.log(resp);
    });
  }
}
