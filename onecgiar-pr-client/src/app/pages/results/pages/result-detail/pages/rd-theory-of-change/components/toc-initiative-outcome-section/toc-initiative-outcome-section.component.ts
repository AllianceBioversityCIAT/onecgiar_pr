import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from './services/toc-initiative-outcome-lists.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-toc-initiative-outcome-section',
  templateUrl: './toc-initiative-outcome-section.component.html',
  styleUrls: ['./toc-initiative-outcome-section.component.scss']
})
export class TocInitiativeOutcomeSectionComponent {
  constructor(private api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public rolesSE: RolesService, public dataControlSE: DataControlService) {}

  outcomeList = [];
  outputList = [];
  eoiList = [];
  fullInitiativeToc = null;
  showe = false;
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_fullInitiativeTocByinitId();
    this.GET_eoi();
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.result_toc_result.results_id, this.result_toc_result.initiative_id, 1).subscribe({
      next: ({ response }) => {
        this.outputList = [];
        this.outputList = response;
      },
      error: err => {
        this.outputList = [];
        console.error(err);
      }
    });
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        this.outputList = response;
        //(response);
      },
      err => {
        this.outputList = [];
        console.error(err);
      }
    );*/
  }

  GET_eoi() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.result_toc_result.results_id, this.result_toc_result.initiative_id, 3).subscribe({
      next: ({ response }) => {
        this.eoiList = [];
        this.eoiList = response;
      },
      error: err => {
        this.eoiList = [];
        console.error(err);
      }
    });
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 3).subscribe(
      ({ response }) => {
        this.eoiList = [];
        this.eoiList = response;
        //(response);
      },
      err => {
        this.eoiList = [];
        console.error(err);
      }
    );*/
  }

  GET_fullInitiativeTocByinitId() {
    this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.result_toc_result.initiative_id).subscribe(
      ({ response }) => {
        this.fullInitiativeToc = response[0]?.toc_id;
      },
      err => {
        console.error(err);
      }
    );
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.result_toc_result.results_id, this.result_toc_result.initiative_id, 2).subscribe({
      next: ({ response }) => {
        this.outcomeList = response;
      },
      error: err => {
        this.outcomeList = [];
        this.outputList = [];
        console.error(err);
      }
    });
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.result_toc_result.initiative_id, 2).subscribe(
      ({ response }) => {
        this.outcomeList = response;
        //(response);
        //(response);
        //('%cOutput list', 'background: #222; color: #aaeaf5');
      },
      err => {
        this.outcomeList = [];
        this.outputList = [];
        console.error(err);
      }
    );*/
  }
}
