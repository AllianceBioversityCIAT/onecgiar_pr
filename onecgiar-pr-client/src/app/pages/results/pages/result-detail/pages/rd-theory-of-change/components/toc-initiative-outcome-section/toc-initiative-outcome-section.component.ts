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
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.api.resultsSE.currentResultId, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        this.outputList = response;
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

  valdiateEOI() {
    //   console.log(this.yesornotValue);
    //   if (this.yesornotValue == false) this.outcomeLevelValue = 3;
  }
}
