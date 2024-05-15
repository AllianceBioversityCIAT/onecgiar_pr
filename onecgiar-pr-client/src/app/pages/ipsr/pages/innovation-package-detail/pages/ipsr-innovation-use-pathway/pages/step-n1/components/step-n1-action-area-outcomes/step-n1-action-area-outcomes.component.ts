import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-action-area-outcomes',
  templateUrl: './step-n1-action-area-outcomes.component.html',
  styleUrls: ['./step-n1-action-area-outcomes.component.scss']
})
export class StepN1ActionAreaOutcomesComponent implements OnInit {
  @Input() body = new IpsrStep1Body();
  actionAreasOutcomesList: any = null;
  constructor(private ipsrDataControlSE: IpsrDataControlService, public api: ApiService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.GET_tocLevelsByresultId();

    this.api.resultsSE.GETAllClarisaActionAreasOutcomes().subscribe(
      ({ response }) => {
        //(response);
        this.actionAreasOutcomesList = response;
        this.actionAreasOutcomesList.geneticInnovation.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));
        this.actionAreasOutcomesList.resilientAgrifoodSystems.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));
        this.actionAreasOutcomesList.systemTrasnformation.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));

        //(this.actionAreasOutcomesList);
        //(this.actionAreasOutcomesList);
      },
      err => {
        console.error(err);
      }
    );
  }
  GET_tocLevelsByresultId() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.ipsrDataControlSE?.detailData?.result_id, this.ipsrDataControlSE?.detailData?.inititiative_id, 4).subscribe({
      next: ({ response }) => {
        this.actionAreasOutcomesList = response;
      },
      error: err => {
        console.error(err);
      }
    });
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.ipsrDataControlSE?.detailData?.inititiative_id, 4).subscribe(
      ({ response }) => {
        this.actionAreasOutcomesList = response;
        //(response);
      },
      err => {
        console.error(err);
      }
    );*/
  }
  removeOption(option) {
    const index = this.body.actionAreaOutcomes.findIndex(valueItem => valueItem.action_area_outcome_id == option.action_area_outcome_id);
    this.body.actionAreaOutcomes.splice(index, 1);
  }
  filterByAAOId(id) {
    //(this.body.actionAreaOutcomes);
    return this.body.actionAreaOutcomes.filter((item: any) => item?.actionAreaId == id);
  }
}
