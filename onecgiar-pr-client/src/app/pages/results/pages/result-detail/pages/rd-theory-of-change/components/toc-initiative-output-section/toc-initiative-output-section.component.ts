import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { TocInitiativeOutcomeListsService } from '../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { environment } from '../../../../../../../../../environments/environment';

@Component({
  selector: 'app-toc-initiative-output-section',
  templateUrl: './toc-initiative-output-section.component.html',
  styleUrls: ['./toc-initiative-output-section.component.scss']
})
export class TocInitiativeOutputSectionComponent {
  outcomeList = [];
  outputList = [];
  platformIsClosed = environment.platformIsClosed;
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;
  fullInitiativeToc = null;
  constructor(public api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public dataControlSE: DataControlService) {}
  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_fullInitiativeToc();
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
}
