import { Component, Input, OnInit } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-toc-initiative-out',
  templateUrl: './toc-initiative-out.component.html',
  styleUrls: ['./toc-initiative-out.component.scss']
})
export class TocInitiativeOutComponent {
  @Input() editable: boolean;
  @Input() initiative: any;
  @Input() resultLevelId: number | string;
  outcomeList = [];
  outputList = [];
  eoiList = [];
  fullInitiativeToc = null;

  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService) {}

  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_fullInitiativeToc();
    this.GET_outputList();
    this.GET_EOIList();
    this.valdiateEOI();
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        this.outputList = response;
        // console.log(response);
      },
      err => {
        this.outputList = [];
        console.log(err);
      }
    );
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 2).subscribe(
      ({ response }) => {
        this.outcomeList = response;
        // console.log(this.outcomeList);
      },
      err => {
        this.outcomeList = [];
        console.log(err);
      }
    );
  }

  GET_EOIList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 3).subscribe(
      ({ response }) => {
        this.eoiList = response;
        // console.log(this.eoiList);
      },
      err => {
        this.eoiList = [];
        console.log(err);
      }
    );
  }

  GET_fullInitiativeToc() {
    this.api.tocApiSE.GET_fullInitiativeToc(this.initiative.initiative_id).subscribe(
      ({ response }) => {
        // console.log(response);
        this.fullInitiativeToc = response[0]?.toc_id;
      },
      err => {
        console.log(err);
      }
    );
  }

  valdiateEOI() {
    //   console.log(this.yesornotValue);
    if (this.initiative.planned_result == false) this.initiative.toc_level_id = 3;
  }
}
