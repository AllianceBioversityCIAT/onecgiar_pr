import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-impact-areas',
  templateUrl: './step-n1-impact-areas.component.html',
  styleUrls: ['./step-n1-impact-areas.component.scss']
})
export class StepN1ImpactAreasComponent {
  @Input() body = new IpsrStep1Body();
  allImpactAreaIndicators = [];
  currentImpactAreaID = null;
  impactAreasData = [
    { id: 1, imageRoute: '1', selected: false, color: '#ec7427' },
    { id: 2, imageRoute: '2', selected: false, color: '#1275ba' },
    { id: 3, imageRoute: '3', selected: false, color: '#fdca3d' },
    { id: 4, imageRoute: '4', selected: false, color: '#377431' },
    { id: 5, imageRoute: '5', selected: false, color: '#8ebf3e' }
  ];
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    this.GET_AllClarisaImpactAreaIndicators();
  }

  GET_AllClarisaImpactAreaIndicators() {
    this.api.resultsSE.GET_AllglobalTarget().subscribe(({ response }) => {
      // console.log(response);
      this.allImpactAreaIndicators = response;
      this.allImpactAreaIndicators.map(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
    });
  }

  filterImpactAreaIndicatorsByImpactAreaID(iaID) {
    return this.allImpactAreaIndicators.filter((item: any) => item?.impactAreaId == iaID);
  }

  removeOption(option) {
    const index = this.body.impactAreas.findIndex((valueItem: any) => valueItem.targetId == option.targetId);
    this.body.impactAreas.splice(index, 1);
  }

  selectImpactArea(impactAreaItem) {
    this.impactAreasData.map((iaitem: any) => (iaitem.selected = false));
    impactAreaItem.selected = true;
    this.currentImpactAreaID = impactAreaItem.id;
  }
}
