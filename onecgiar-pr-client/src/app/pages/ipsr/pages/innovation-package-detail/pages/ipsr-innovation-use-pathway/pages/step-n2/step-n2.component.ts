import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-step-n2',
    templateUrl: './step-n2.component.html',
    styleUrls: ['./step-n2.component.scss'],
    standalone: false
})
export class StepN2Component implements OnInit {
  constructor(public api: ApiService, public ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Step 2');
  }

  routerStep() {
    if (this.api.rolesSE.isAdmin && !this.api.isStepTwoTwo) {
      return 'basic-info';
    }

    return '../step-3';
  }

  routerStepBack() {
    if (this.api.rolesSE.isAdmin && !this.api.isStepTwoOne) {
      return 'complementary-innovation';
    }

    return '../step-1';
  }
}
