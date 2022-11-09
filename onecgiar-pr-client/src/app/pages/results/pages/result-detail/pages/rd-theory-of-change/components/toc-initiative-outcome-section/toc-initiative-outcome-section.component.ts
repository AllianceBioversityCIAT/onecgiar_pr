import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from './services/toc-initiative-outcome-lists.service';

@Component({
  selector: 'app-toc-initiative-outcome-section',
  templateUrl: './toc-initiative-outcome-section.component.html',
  styleUrls: ['./toc-initiative-outcome-section.component.scss']
})
export class TocInitiativeOutcomeSectionComponent {
  constructor(private api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService) {}

  inits = [{ name: 'INIT-17 SAPLING', yesornotValue: false, select: null }];
  outcomeLevelValue = null;
  otherContributorsList = [
    { name: 'INIT-10 F2R-CWANA', yesornotValue: true, select: null },
    { name: 'INIT-22 TAFS-WCA', yesornotValue: false, select: null }
  ];
  yesornotValue;
  name;
  outcomeList = [];

  onSelectOutcomeLevel(outcomeLevelId) {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.api.resultsSE.currentResultId, outcomeLevelId).subscribe(
      ({ response }) => {
        this.outcomeList = response;
        console.log(this.outcomeList);
      },
      err => {
        this.outcomeList = [];
        console.log(err);
      }
    );
  }
  valdiateEOI() {
    console.log(this.yesornotValue);
    if (this.yesornotValue == false) this.outcomeLevelValue = 3;
  }
}
