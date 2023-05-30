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
  @Input() isIpsr: boolean = false;
  outcomeList = [];
  outputList = [];
  eoiList = [];
  fullInitiativeToc = null;

  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService) {}

  ngOnInit(): void {
    console.log(this.initiative);

    this.GET_outcomeList();
    this.GET_fullInitiativeTocByinitId();
    this.GET_outputList();
    this.GET_EOIList();
    this.valdiateEOI(this.initiative);
  }

  getDescription(official_code, short_name) {
    const tocText = `<strong>${official_code} ${short_name}</strong> - Are you able to match your reported result to a planned result in this Initiative's Theory of Change?`;
    const contributorsText = `Is this result planned in the <strong>${official_code} ${short_name}</strong> ToC?`;
    return this.isIpsr ? contributorsText : tocText;
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        this.outputList = response;
        //(response);
      },
      err => {
        this.outputList = [];
        console.error(err);
      }
    );
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 2).subscribe(
      ({ response }) => {
        this.outcomeList = response;
        //(this.outcomeList);
      },
      err => {
        this.outcomeList = [];
        console.error(err);
      }
    );
  }

  GET_EOIList() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 3).subscribe(
      ({ response }) => {
        this.eoiList = response;
        //(this.eoiList);
      },
      err => {
        this.eoiList = [];
        console.error(err);
      }
    );
  }

  GET_fullInitiativeTocByinitId() {
    this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.initiative.initiative_id).subscribe(
      ({ response }) => {
        //(response);
        this.fullInitiativeToc = response[0]?.toc_id;
      },
      err => {
        console.error(err);
      }
    );
  }

  showOutcomeLevel = true;

  valdiateEOI(initiative) {
    this.showOutcomeLevel = false;
    if (initiative.planned_result == false) initiative.toc_level_id = 3;
    setTimeout(() => {
      this.showOutcomeLevel = true;
    }, 100);
  }
}
