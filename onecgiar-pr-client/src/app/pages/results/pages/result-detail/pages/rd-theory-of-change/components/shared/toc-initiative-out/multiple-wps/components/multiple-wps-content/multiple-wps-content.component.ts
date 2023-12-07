import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../../../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../../rd-theory-of-changes-services.service';

@Component({
  selector: 'app-multiple-wps-content',
  templateUrl: './multiple-wps-content.component.html',
  styleUrls: ['./multiple-wps-content.component.scss']
})
export class MultipleWPsContentComponent implements OnChanges {
  @Input() editable: boolean;
  @Input() activeTab: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() showMultipleWPsContent: boolean = true;

  @Input() allTabsCreated = [];
  @Input() outcomeList = [];
  @Input() outputList = [];
  @Input() eoiList = [];

  @Input() selectedOptionsOutput = [];
  @Input() selectedOptionsOutcome = [];
  @Input() selectedOptionsEOI = [];

  indicatorView = false;

  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

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
        }, 80);
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
    if (this.resultLevelId === 1 ? this.theoryOfChangesServices?.planned_result === false : true) {
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
    if (this.showMultipleWPsContent && this.outcomeList.length > 0 && this.outputList.length > 0 && this.eoiList.length > 0) {
      if (this.activeTab?.toc_result_id && this.activeTab?.initiative_id) {
        this.getIndicator();
      }
      this.pushSelectedOptions();
    }
  }

  pushSelectedOptions() {
    this.allTabsCreated.forEach(tab => {
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

  validateSelectedOptionOutPut(tab?: any) {
    const selectedOption = tab ? this.outputList.find(item => item.toc_result_id === tab.toc_result_id) : this.outputList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutput = this.selectedOptionsOutput.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutput.push(selectedOption);

    this.outputList = this.outputList.map(item => {
      const finded = this.selectedOptionsOutput.find(option => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id);
      item.disabledd = !!finded;
      return item;
    });
  }

  validateSelectedOptionOutCome(tab?: any) {
    const selectedOption = tab ? this.outcomeList.find(item => item.toc_result_id === tab.toc_result_id) : this.outcomeList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutcome.push(selectedOption);

    this.outcomeList = this.outcomeList.map(item => {
      const finded = this.selectedOptionsOutcome.find(option => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id);
      item.disabledd = !!finded;
      return item;
    });
  }

  validateSelectedOptionEOI(tab?: any) {
    const selectedOption = tab ? this.eoiList.find(item => item.toc_result_id === tab.toc_result_id) : this.eoiList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsEOI = this.selectedOptionsEOI.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsEOI.push(selectedOption);

    this.eoiList = this.eoiList.map(item => {
      const finded = this.selectedOptionsEOI.find(option => option.toc_result_id === item.toc_result_id);
      item.disabledd = !!finded;
      return item;
    });
  }
}
