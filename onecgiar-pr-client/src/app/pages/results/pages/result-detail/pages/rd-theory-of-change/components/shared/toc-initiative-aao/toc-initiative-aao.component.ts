import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-changes-services.service';

@Component({
    selector: 'app-toc-initiative-aao',
    templateUrl: './toc-initiative-aao.component.html',
    styleUrls: ['./toc-initiative-aao.component.scss'],
    standalone: false
})
export class TocInitiativeAaoComponent implements OnInit {
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
    this.GET_fullInitiativeTocByinitId();
    this.getInformatioActionAreaResult();
  }

  getInformatioActionAreaResult() {
    this.api.resultsSE.GET_resultActionArea(this.initiative?.result_toc_results?.[0]?.results_id, this.initiative?.result_toc_results?.[0]?.initiative_id).subscribe(({ response }) => {
      this.theoryOfChangesServices.resultActionArea.push(response);
      this.theoryOfChangesServices.resultActionArea[this.indexList].init = this.initiative?.result_toc_results?.initiative_id;
      this.theoryOfChangesServices.resultActionArea[this.indexList].consImpactTarget.map(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
      this.theoryOfChangesServices.resultActionArea[this.indexList].consSdgTargets.map(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
      this.theoryOfChangesServices.resultActionArea[this.indexList].action.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));

      this.informationGet = true;
    });
  }

  GET_fullInitiativeTocByinitId() {
    this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.initiative?.result_toc_results?.[0].initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response[0]?.toc_id;
        this.vesiondashboard = true;
      },
      error: err => {
        console.error(err);
      }
    });
  }
}
