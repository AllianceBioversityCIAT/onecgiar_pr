import { Component, OnInit } from '@angular/core';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';

@Component({
  selector: 'app-ipsr-innovation-use-pathway',
  templateUrl: './ipsr-innovation-use-pathway.component.html',
  styleUrls: ['./ipsr-innovation-use-pathway.component.scss']
})
export class IpsrInnovationUsePathwayComponent {
  menuOptions: any[];
  constructor(private ipsrDataControlSE: IpsrDataControlService) {}
  ngOnInit() {
    this.menuOptions = [
      { path: 'step-1', routeName: 'Step 1', subName: 'Ambition'},
      { path: 'step-2', routeName: 'Step 2', subName: 'Package' },
      { path: 'step-3', routeName: 'Step 3', subName: 'Assess' },
      { path: 'step-4', routeName: 'Step 4', subName: 'Info' }
    ];
  }
  onSaveSection() {}
}
