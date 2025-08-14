import { Component } from '@angular/core';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';

@Component({
    selector: 'app-ipsr-innovation-use-pathway',
    templateUrl: './ipsr-innovation-use-pathway.component.html',
    styleUrls: ['./ipsr-innovation-use-pathway.component.scss'],
    standalone: false
})
export class IpsrInnovationUsePathwayComponent {
  menuOptions = [
    { path: 'step-1', routeName: 'Step 1', subName: 'Ambition', queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase } },
    { path: 'step-2', routeName: 'Step 2', subName: 'Package', queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase } },
    { path: 'step-3', routeName: 'Step 3', subName: 'Assess', queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase } },
    { path: 'step-4', routeName: 'Step 4', subName: 'Info', queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase } }
  ];

  constructor(public ipsrDataControlSE: IpsrDataControlService) {}
}
