import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from '../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';

@Component({
  selector: 'app-toc-initiative-output-section',
  templateUrl: './toc-initiative-output-section.component.html',
  styleUrls: ['./toc-initiative-output-section.component.scss']
})
export class TocInitiativeOutputSectionComponent {
  inits = [{ name: 'INIT-17 SAPLING', yesornotValue: true, select: null }];
  otherContributorsList = [
    { name: 'INIT-10 F2R-CWANA', yesornotValue: true, select: null },
    { name: 'INIT-22 TAFS-WCA', yesornotValue: false, select: null }
  ];
  yesornotValue = true;
  name;
  select = 3;
  outcomeList = [];
  outputList = [];
  outcomeLevelValue = 3;
  constructor(private api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService) {}
  ngOnInit(): void {
    this.GET_tocLevelsByresultId();
    this.GET_fullInitiativeToc();
  }
  GET_tocLevelsByresultId(outcomeLevelId?) {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.api.resultsSE.currentResultId, this.yesornotValue ? 1 : 2).subscribe(
      ({ response }) => {
        this.outcomeList = [];
        this.outputList = [];
        this.yesornotValue ? (this.outputList = response) : (this.outcomeList = response);
        this.yesornotValue ? console.log('%cOutput list', 'background: #222; color: #aaeaf5') : console.log('%cOutcomes list', 'background: #222; color: #aaeaf5');

        console.log(response);
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
        console.log('%cFull initiative toc', 'background: #222; color: #d84242');
        console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
}
