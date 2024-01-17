import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-action-area-outcome',
  templateUrl: './action-area-outcome.component.html',
  styleUrls: ['./action-area-outcome.component.scss']
})
export class ActionAreaOutcomeComponent implements OnInit {
  @Input() body = [];
  @Input() actionRequid = false;
  allImpactAreaIndicators = [];
  currentImpactAreaID = null;
  actionAreasOutcomesList: any = [];
  impactAreasData = [
    { id: 1, imageRoute: '1', selected: false, color: '#bb3a26', name: 'Systems Transformation outcomes' },
    { id: 2, imageRoute: '2', selected: false, color: '#b96a28', name: 'Resilient Agrifood Systems outcomes' },
    { id: 3, imageRoute: '3', selected: false, color: '#d19f2a', name: 'Genetic Innovation outcomes' }
  ];

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GET_AllClarisaImpactAreaIndicators();
  }

  GET_AllClarisaImpactAreaIndicators() {
    this.api.resultsSE.GETAllClarisaActionAreasOutcomes().subscribe({
      next: ({ response }) => {
        this.actionAreasOutcomesList = response;
        this.actionAreasOutcomesList.systemTrasnformation.forEach(item => (item.full_name = `<strong>Systems Transformation</strong> (${item.outcomeSMOcode}) - ${item.outcomeStatement}`));
        this.actionAreasOutcomesList.resilientAgrifoodSystems.forEach(item => (item.full_name = `<strong>Resilient Agrifood Systems</strong> (${item.outcomeSMOcode}) - ${item.outcomeStatement}`));
        this.actionAreasOutcomesList.geneticInnovation.forEach(item => (item.full_name = `<strong>Genetic Innovation</strong> (${item.outcomeSMOcode}) - ${item.outcomeStatement}`));
      },
      error: err => {
        console.error(err);
      }
    });
  }

  filterImpactAreaIndicatorsByImpactAreaID(iaID) {
    return this.allImpactAreaIndicators.filter((item: any) => item?.impactAreaId == iaID);
  }

  removeOption(option) {
    const index = this.body.findIndex((valueItem: any) => valueItem.targetId == option.targetId);
    this.body.splice(index, 1);
  }

  selectImpactArea(impactAreaItem) {
    if (this.api.rolesSE.readOnly) return;
    this.impactAreasData.forEach((iaitem: any) => (iaitem.selected = false));
    impactAreaItem.selected = true;
    this.currentImpactAreaID = impactAreaItem.id;
  }
}
