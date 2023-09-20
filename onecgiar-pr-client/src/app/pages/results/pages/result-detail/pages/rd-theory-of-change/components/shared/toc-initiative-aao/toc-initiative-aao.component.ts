import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-changes-services.service';

@Component({
  selector: 'app-toc-initiative-aao',
  templateUrl: './toc-initiative-aao.component.html',
  styleUrls: ['./toc-initiative-aao.component.scss']
})
export class TocInitiativeAaoComponent {
  @Input() readOnly: boolean;
  @Input() initiative: any;
  @Input() editable: boolean;
  @Input() indexList: any;
  value = true;
  actionAreasOutcomesList = [];
  informationGet = false;
  fullInitiativeToc = '';
  vesiondashboard = false;
  constructor(public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

  ngOnInit(): void {
    //this.GET_tocLevelsByresultId();
    this.GET_fullInitiativeTocByinitId();
    this.getInformatioActionAreaResult();
  }
  /*
  GET_tocLevelsByresultId() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.initiative.results_id, this.initiative.initiative_id, 4).subscribe({
      next: ({ response }) => {
        this.actionAreasOutcomesList = response;
      },
      error: err => {
        console.error(err);
      }
    });
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 4).subscribe(
      ({ response }) => {
        this.actionAreasOutcomesList = response;
        //(response);
      },
      err => {
        console.error(err);
      }
    );
  }*/

  async getInformatioActionAreaResult() {
    await this.api.resultsSE.GET_resultActionArea(this.initiative?.results_id, this.initiative?.initiative_id).subscribe(({ response }) => {
      this.theoryOfChangesServices.resultActionArea.push(response);
      this.theoryOfChangesServices.resultActionArea[this.indexList].init = this.initiative?.initiative_id;
      this.theoryOfChangesServices.resultActionArea[this.indexList].consImpactTarget.map(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
      this.theoryOfChangesServices.resultActionArea[this.indexList].consSdgTargets.map(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
      this.theoryOfChangesServices.resultActionArea[this.indexList].action.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));

      //(this.theoryOfChangesServices.resultActionArea);
      this.informationGet = true;
    });
  }

  GET_fullInitiativeTocByinitId() {
    this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.initiative.initiative_id).subscribe(
      ({ response }) => {
        this.fullInitiativeToc = response[0]?.toc_id;
        this.vesiondashboard = true;
      },
      err => {
        console.error(err);
      }
    );
  }
}
