import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-ipsr-annual-updating',
    templateUrl: './ipsr-annual-updating.component.html',
    styleUrls: ['./ipsr-annual-updating.component.scss'],
    standalone: false
})
export class IpsrAnnualUpdatingComponent implements OnInit {
  @Input() ipsrGeneralInfoBody: any;
  options = [
    {
      name: 'Innovation Package is active/investment was continued.',
      value: false
    },
    {
      name: 'Innovation Package is inactive/investment was discontinued, because:',
      value: true
    }
  ];

  alertTextIPSR: string = '';

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.getAlertNarrativeIPSR();
  }

  getAlertNarrativeIPSR(): void {
    this.api.resultsSE.GET_globalNarratives('updated_ipsr_guidance').subscribe(({ response }) => {
      this.alertTextIPSR = response.value;
    });
  }

  isIpsrDiscontinuedOptionsTrue(): boolean {
    return this.ipsrGeneralInfoBody?.is_discontinued ? this.ipsrGeneralInfoBody.discontinued_options.some(option => option.value) : true;
  }
}
