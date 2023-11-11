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
  @Input() allTabs: any = [];
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() showMultipleWPsContent: boolean = true;
  selectedOptionsOutput = [];
  selectedOptionsOutcome = [];
  selectedOptionsEOI = [];
  currentPlannedResult = null;
  array = [];
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
    this.currentPlannedResult = this.activeTab?.planned_result;
  }

  pushSelectedOptions() {
    this.allTabs.forEach(tab => {
      if (tab?.toc_level_id === 1) {
        this.validateSelectedOptionOutPut(tab);
      }
      if (tab?.toc_level_id === 2) {
        this.validateSelectedOptionOutCome(tab);
      }
      if (tab?.toc_level_id === 3) {
        this.validateSelectedOptionEOI(tab);
      }
    });
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 1).subscribe({
      next: ({ response }) => {
        this.outputList = response;
        this.pushSelectedOptions();
      },
      error: err => {
        this.outputList = [];
        console.error(err);
      }
    });
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 2).subscribe({
      next: ({ response }) => {
        this.outcomeList = response;
        this.pushSelectedOptions();
      },
      error: err => {
        this.outcomeList = [];
        console.error(err);
      }
    });
  }

  GET_EOIList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 3).subscribe({
      next: ({ response }) => {
        this.eoiList = response;
        this.pushSelectedOptions();
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
    }, 100);
  }

  validateSelectedOptionOutCome(tab?: any) {
    let selectedOption;

    if (!tab) {
      selectedOption = this.outcomeList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);
      if (!selectedOption) return;

      selectedOption.tabId = this.activeTab?.uniqueId;
    } else {
      selectedOption = this.outcomeList.find(item => item.toc_result_id === tab?.toc_result_id);

      if (!selectedOption) return;

      selectedOption.tabId = tab?.uniqueId;
    }

    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutcome.push(selectedOption);

    this.outcomeList = this.outcomeList.map(item => {
      const finded = this.selectedOptionsOutcome.find(option => option.work_package_id === item.work_package_id);
      if (finded) {
        item.disabledd = true;
      } else {
        item.disabledd = false;
      }
      return item;
    });
  }

  validateSelectedOptionEOI(tab?: any) {
    let selectedOption;

    if (!tab) {
      selectedOption = this.eoiList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

      if (!selectedOption) return;

      selectedOption.tabId = this.activeTab?.uniqueId;
    } else {
      selectedOption = this.eoiList.find(item => item.toc_result_id === tab?.toc_result_id);

      if (!selectedOption) return;

      selectedOption.tabId = tab?.uniqueId;
    }

    this.selectedOptionsEOI = this.selectedOptionsEOI.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsEOI.push(selectedOption);

    this.eoiList = this.eoiList.map(item => {
      const finded = this.selectedOptionsEOI.find(option => option.toc_result_id === item.toc_result_id);
      if (finded) {
        item.disabledd = true;
      } else {
        item.disabledd = false;
      }
      return item;
    });
  }

  validateSelectedOptionOutPut(tab?: any) {
    let selectedOption;

    if (!tab) {
      selectedOption = this.outputList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

      if (!selectedOption) return;

      selectedOption.tabId = this.activeTab?.uniqueId;
    } else {
      selectedOption = this.outputList.find(item => item.toc_result_id === tab?.toc_result_id);

      if (!selectedOption) return;

      selectedOption.tabId = tab?.uniqueId;
    }

    if (!selectedOption) return;

    this.selectedOptionsOutput = this.selectedOptionsOutput.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutput.push(selectedOption);

    this.outputList = this.outputList.map(item => {
      const finded = this.selectedOptionsOutput.find(option => option.work_package_id === item.work_package_id);
      if (finded) {
        item.disabledd = true;
      } else {
        item.disabledd = false;
      }
      return item;
    });
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

    if (this.activeTab?.planned_result !== this.currentPlannedResult) {
      this.selectedOptionsOutput = [];
      this.selectedOptionsOutcome = [];
      this.selectedOptionsEOI = [];
      this.GET_outputList();
      this.GET_outcomeList();
      this.GET_EOIList();
      this.currentPlannedResult = this.activeTab?.planned_result;
    }

    if (this.activeTab?.toc_result_id !== null && this.activeTab?.initiative_id !== null) {
      this.getIndicator();
    }
  }
}
