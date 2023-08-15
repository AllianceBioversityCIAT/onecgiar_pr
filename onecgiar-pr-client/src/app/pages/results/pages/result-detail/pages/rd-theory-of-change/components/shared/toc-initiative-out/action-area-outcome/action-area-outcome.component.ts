import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-action-area-outcome',
  templateUrl: './action-area-outcome.component.html',
  styleUrls: ['./action-area-outcome.component.scss']
})
export class ActionAreaOutcomeComponent implements OnInit {
  @Input() body = [];
  @Input() impactAreaRequid = false;
  allImpactAreaIndicators = [];
  currentImpactAreaID = null;
  actionAreasOutcomesList: any = []
  impactAreasData = [
    { id: 1, imageRoute: '1', selected: false, color: '', name: 'Systems Transformation outcomes' },
    { id: 2, imageRoute: '2', selected: false, color: '', name: 'Resilient Agrifood Systems outcomes' },
    { id: 3, imageRoute: '3', selected: false, color: '', name: 'Genetic Innovation outcomes' },
  ];
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    this.GET_AllClarisaImpactAreaIndicators();
  }

  GET_AllClarisaImpactAreaIndicators() {
    this.api.resultsSE.GETAllClarisaActionAreasOutcomes().subscribe(
      ({ response }) => {
       
        this.actionAreasOutcomesList = response;
        this.actionAreasOutcomesList.geneticInnovation.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));
        this.actionAreasOutcomesList.resilientAgrifoodSystems.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));
        this.actionAreasOutcomesList.systemTrasnformation.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));
        console.log(this.actionAreasOutcomesList);
        
        //(this.actionAreasOutcomesList);
      },
      err => {
        console.error(err);
      }
    );
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
    this.impactAreasData.map((iaitem: any) => (iaitem.selected = false));
    impactAreaItem.selected = true;
    this.currentImpactAreaID = impactAreaItem.id;
  }

}
