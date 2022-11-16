import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from './services/toc-initiative-outcome-lists.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';

@Component({
  selector: 'app-toc-initiative-outcome-section',
  templateUrl: './toc-initiative-outcome-section.component.html',
  styleUrls: ['./toc-initiative-outcome-section.component.scss']
})
export class TocInitiativeOutcomeSectionComponent {
  constructor(private api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService) {}
  outcomeList = [];
  outputList = [];
  eoiList = [];
  fullInitiativeToc = null;
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_fullInitiativeToc();
    this.GET_eoi();
    this.valdiateEOI();
    // console.log(this.result_toc_result.initiative_id);
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        this.outputList = response;
        console.log(response);
      },
      err => {
        this.outputList = [];
        console.log(err);
      }
    );
  }

  GET_eoi() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 3).subscribe(
      ({ response }) => {
        this.eoiList = [];
        this.eoiList = response;
        console.log(response);
      },
      err => {
        this.eoiList = [];
        console.log(err);
      }
    );
  }

  GET_fullInitiativeToc() {
    this.api.tocApiSE.GET_fullInitiativeToc(this.result_toc_result.initiative_id).subscribe(
      ({ response }) => {
        this.fullInitiativeToc = response[0]?.toc_id;
      },
      err => {
        console.log(err);
      }
    );
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 2).subscribe(
      ({ response }) => {
        this.outcomeList = response;
        console.log(response);
        // console.log(response);
        // console.log('%cOutput list', 'background: #222; color: #aaeaf5');
      },
      err => {
        this.outcomeList = [];
        this.outputList = [];
        console.log(err);
      }
    );
  }

  valdiateEOI() {
    //   console.log(this.yesornotValue);
    if (this.result_toc_result?.planned_result == false) this.result_toc_result.toc_level_id = 3;
  }
}
