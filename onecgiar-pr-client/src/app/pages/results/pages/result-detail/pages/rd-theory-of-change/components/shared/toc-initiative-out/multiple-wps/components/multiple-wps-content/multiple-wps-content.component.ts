import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../../../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../../rd-theory-of-changes-services.service';
import { MultipleWPsServiceService } from '../../services/multiple-wps-service.service';

@Component({
  selector: 'app-multiple-wps-content',
  templateUrl: './multiple-wps-content.component.html',
  styleUrls: ['./multiple-wps-content.component.scss']
})
export class MultipleWPsContentComponent implements OnInit, OnChanges {
  @Input() editable: boolean;
  @Input() activeTab: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() showMultipleWPsContent: boolean = true;
  outcomeList = [];
  outputList = [];
  eoiList = [];
  showOutcomeLevel = true;
  indicatorView = false;

  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService, public multipleWpsService: MultipleWPsServiceService) {}

  ngOnInit(): void {
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_EOIList();
    this.validateEOI();
    if (this.activeTab?.toc_result_id !== null && this.activeTab?.initiative_id !== null) {
      this.getIndicator();
    }
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.api.dataControlSE.currentNotification?.results_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 1).subscribe({
      next: ({ response }) => {
        this.outputList = [];
        this.outputList = response;
      },
      error: err => {
        this.outputList = [];
        console.error(err);
      }
    });
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 2).subscribe({
      next: ({ response }) => {
        this.outcomeList = response;
      },
      error: err => {
        this.outcomeList = [];
        console.error(err);
      }
    });
  }

  GET_EOIList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 3).subscribe({
      next: ({ response }) => {
        this.eoiList = response;
      },
      error: err => {
        this.eoiList = [];
        console.error(err);
      }
    });
  }

  validateEOI() {
    this.showOutcomeLevel = false;

    if (!this.activeTab.planned_result) {
      this.activeTab.toc_level_id = 3;
    }

    this.indicatorView = false;
    setTimeout(() => {
      this.showOutcomeLevel = true;
    }, 0);
  }

  getIndicator() {
    this.indicatorView = false;

    this.api.resultsSE.Get_indicator(this.activeTab?.toc_result_id, this.activeTab?.initiative_id).subscribe({
      next: ({ response }) => {
        this.activeTab.indicators = response?.informationIndicator;
        this.activeTab.impactAreasTargets = response?.impactAreas.map(item => ({ ...item, full_name: `<strong>${item.name}</strong> - ${item.target}` }));
        this.activeTab.sdgTargest = response?.sdgTargets.map(item => ({ ...item, full_name: `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}` }));
        this.activeTab.actionAreaOutcome = response?.actionAreaOutcome.map(item => ({ ...item, full_name: `${item.actionAreaId === 1 ? '<strong>Systems Transformation</strong>' : item.actionAreaId === 2 ? '<strong>Resilient Agrifood Systems</strong>' : '<strong>Genetic Innovation</strong>'} (${item.outcomeSMOcode}) - ${item.outcomeStatement}` }));
        this.activeTab.is_sdg_action_impact = response?.is_sdg_action_impact;

        setTimeout(() => {
          this.indicatorView = true;
        }, 100);
      },
      error: err => {
        console.error(err);
      }
    });
  }

  narrativeTypeResult() {
    let narrative = '';
    if (this.resultLevelId === 1) {
      narrative = 'output';
    }
    if (this.showOutcomeLevel && (this.resultLevelId === 1 ? this.theoryOfChangesServices?.planned_result === false : true)) {
      narrative = 'outcome';
    }
    if ((this.resultLevelId === 1 ? this.theoryOfChangesServices?.planned_result === false : true) && this.activeTab.toc_level_id != 3) {
      narrative = 'outcome';
    }
    if ((this.resultLevelId === 1 ? this.theoryOfChangesServices?.planned_result === false : true) && this.activeTab.toc_level_id === 3) {
      narrative = 'outcome';
    }

    return `Indicator(s) of the ${narrative} selected`;
  }

  ngOnChanges() {
    this.validateEOI();
    if (this.activeTab?.toc_result_id !== null && this.activeTab?.initiative_id !== null) {
      this.getIndicator();
    }
  }
}
