import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-sdg-targets',
  templateUrl: './step-n1-sdg-targets.component.html',
  styleUrls: ['./step-n1-sdg-targets.component.scss']
})
export class StepN1SdgTargetsComponent {
  @Input() body = new IpsrStep1Body();
  currentImpactAreaID = null;
  impactAreasData = [
    { id: 1, imageRoute: '1', selected: false, color: '#ec7427' },
    { id: 2, imageRoute: '2', selected: false, color: '#1275ba' },
    { id: 3, imageRoute: '3', selected: false, color: '#fdca3d' },
    { id: 4, imageRoute: '4', selected: false, color: '#377431' },
    { id: 5, imageRoute: '5', selected: false, color: '#8ebf3e' }
  ];
  constructor() {}
  selectImpactArea(impactAreaItem) {
    this.impactAreasData.map((iaitem: any) => (iaitem.selected = false));
    impactAreaItem.selected = true;
    this.currentImpactAreaID = impactAreaItem.id;
  }
}
