import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-action-area-outcomes',
  templateUrl: './step-n1-action-area-outcomes.component.html',
  styleUrls: ['./step-n1-action-area-outcomes.component.scss']
})
export class StepN1ActionAreaOutcomesComponent {
  @Input() body = new IpsrStep1Body();
  actionAreasOutcomesList = [];
  constructor(private ipsrDataControlSE: IpsrDataControlService, private api: ApiService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.GET_tocLevelsByresultId();

    this.api.resultsSE.GETAllClarisaActionAreasOutcomes().subscribe(
      ({ response }) => {
        this.actionAreasOutcomesList = response;
        // console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
  GET_tocLevelsByresultId() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.ipsrDataControlSE?.detailData?.inititiative_id, 4).subscribe(
      ({ response }) => {
        this.actionAreasOutcomesList = response;
        // console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
}
