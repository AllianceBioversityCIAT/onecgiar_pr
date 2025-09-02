/* eslint-disable arrow-parens */
import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-step-n1-impact-areas',
    templateUrl: './step-n1-impact-areas.component.html',
    styleUrls: ['./step-n1-impact-areas.component.scss'],
    standalone: false
})
export class StepN1ImpactAreasComponent implements OnInit {
  @Input() body = new IpsrStep1Body();
  allImpactAreaIndicators = [];
  currentImpactAreaID = null;
  impactAreasData = [
    { id: 1, imageRoute: '1', selected: false, color: '#ec7427', name: 'Nutrition, Health and Food Security' },
    { id: 2, imageRoute: '2', selected: false, color: '#1275ba', name: 'Poverty Reduction, Livelihoods and Jobs' },
    { id: 3, imageRoute: '3', selected: false, color: '#fdca3d', name: 'Gender Equality, Youth and Social Inclusion' },
    { id: 4, imageRoute: '4', selected: false, color: '#377431', name: 'Climate Adaptation and Mitigation' },
    { id: 5, imageRoute: '5', selected: false, color: '#8ebf3e', name: 'Environmental Health and Biodiversity' }
  ];

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GET_AllClarisaImpactAreaIndicators();
  }

  GET_AllClarisaImpactAreaIndicators() {
    this.api.resultsSE.GET_AllglobalTarget().subscribe(({ response }) => {
      this.allImpactAreaIndicators = response;
      this.allImpactAreaIndicators.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
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
    if (this.api.rolesSE.readOnly) return;
    this.impactAreasData.forEach((iaitem: any) => (iaitem.selected = false));
    impactAreaItem.selected = true;
    this.currentImpactAreaID = impactAreaItem.id;
  }
}
