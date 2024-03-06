import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { IpsrGreenCheckComponent } from '../../../../../../components/ipsr-green-check/ipsr-green-check.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-step-n2',
  standalone: true,
  templateUrl: './step-n2.component.html',
  styleUrls: ['./step-n2.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    RouterLinkActive,
    IpsrGreenCheckComponent
  ]
})
export class StepN2Component implements OnInit {
  constructor(public api: ApiService) {}

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
