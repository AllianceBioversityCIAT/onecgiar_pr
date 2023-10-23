import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { TocInitiativeOutcomeListsService } from '../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { environment } from '../../../../../../../../../environments/environment';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';

@Component({
  selector: 'app-toc-initiative-output-section',
  templateUrl: './toc-initiative-output-section.component.html',
  styleUrls: ['./toc-initiative-output-section.component.scss']
})
export class TocInitiativeOutputSectionComponent implements OnInit {
  outcomeList = [];
  outputList = [];

  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;
  // fullInitiativeToc = null;
  // primarySubmitter = null;

  constructor(public api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public dataControlSE: DataControlService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    // this.GET_fullInitiativeTocByinitId();
    // this.primarySubmitter = this.theoryOfChangesServices.getPrimarySubmitter();
    console.log('este', this.theoryOfChangesServices);
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

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.result_toc_result.results_id, this.result_toc_result.initiative_id, 2).subscribe({
      next: ({ response }) => {
        this.outcomeList = [];
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
        this.outcomeList = [];
        this.outcomeList = response;
        //(response);
      },
      err => {
        this.outcomeList = [];
        this.outputList = [];
        console.error(err);
      }
    );*/
  }

  // GET_fullInitiativeTocByinitId() {
  //   this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.result_toc_result.initiative_id).subscribe(
  //     ({ response }) => {
  //       //(response);
  //       this.fullInitiativeToc = response[0]?.toc_id;
  //     },
  //     err => {
  //       console.error(err);
  //     }
  //   );
  // }
}
