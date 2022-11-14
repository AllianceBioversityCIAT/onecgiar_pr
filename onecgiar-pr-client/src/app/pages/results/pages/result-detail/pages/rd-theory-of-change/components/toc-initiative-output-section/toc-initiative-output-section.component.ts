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
  constructor(private api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService) {}
  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_fullInitiativeToc();
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.api.resultsSE.currentResultId, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        // this.outputList = response;
        // console.log(response);
        // console.log('%cOutcomes list', 'background: #222; color: #aaeaf5');
      },
      err => {
        this.outputList = [];
        console.log(err);
      }
    );
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.api.resultsSE.currentResultId, 2).subscribe(
      ({ response }) => {
        this.outcomeList = [];
        this.outcomeList = response;
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

  GET_fullInitiativeToc() {
    this.api.tocApiSE.GET_fullInitiativeToc(this.api.resultsSE.currentResultId).subscribe(
      ({ response }) => {
        // console.log('%cFull initiative toc', 'background: #222; color: #d84242');
        // console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
}
