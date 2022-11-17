import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { TocInitiativeOutcomeListsService } from '../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';

@Component({
  selector: 'app-toc-initiative-output-section',
  templateUrl: './toc-initiative-output-section.component.html',
  styleUrls: ['./toc-initiative-output-section.component.scss']
})
export class TocInitiativeOutputSectionComponent {
  outcomeList = [];
  outputList = [];
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;
  fullInitiativeToc = null;
  constructor(private api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService) {}
  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_fullInitiativeToc();
    this.valdiateEOI();
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 1).subscribe(
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
    this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 2).subscribe(
      ({ response }) => {
        this.outcomeList = [];
        this.outcomeList = response;
        // console.log(response);
      },
      err => {
        this.outcomeList = [];
        this.outputList = [];
        console.log(err);
      }
    );
  }

  GET_fullInitiativeToc() {
    this.api.tocApiSE.GET_fullInitiativeToc(this.result_toc_result.initiative_id).subscribe(
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
    if (this.result_toc_result?.planned_result == false) this.result_toc_result.toc_level_id = 3;
  }
}
