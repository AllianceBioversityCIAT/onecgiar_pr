import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../../../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../../rd-theory-of-changes-services.service';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';

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

  @Input() allTabsCreated = [];
  @Input() outcomeList = [];
  @Input() outputList = [];
  @Input() eoiList = [];

  @Input() selectedOptionsOutput = [];
  @Input() selectedOptionsOutcome = [];
  @Input() selectedOptionsEOI = [];

  showOutcomeLevel = true;
  indicatorView = false;

  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService, public mappedResultService: MappedResultsModalServiceService) {}

  ngOnInit() {
    this.validateEOI();

    if (this.activeTab?.toc_result_id !== null && this.activeTab?.initiative_id !== null) {
      this.getIndicator();
    }
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

  getIndicator() {
    if (this.resultLevelId === 1) {
      this.indicatorView = false;

      this.api.resultsSE.Get_indicator(this.activeTab?.toc_result_id, this.activeTab?.initiative_id).subscribe({
        next: ({ response }) => {
          this.activeTab.indicators = response?.informationIndicator;
          this.activeTab.impactAreasTargets = response?.impactAreas.map((item) => ({ ...item, full_name: `<strong>${item.name}</strong> - ${item.target}` }));
          this.activeTab.sdgTargest = response?.sdgTargets.map((item) => ({ ...item, full_name: `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}` }));
          this.activeTab.actionAreaOutcome = response?.actionAreaOutcome.map((item) => ({ ...item, full_name: `${item.actionAreaId === 1 ? '<strong>Systems Transformation</strong>' : item.actionAreaId === 2 ? '<strong>Resilient Agrifood Systems</strong>' : '<strong>Genetic Innovation</strong>'} (${item.outcomeSMOcode}) - ${item.outcomeStatement}` }));
          this.activeTab.is_sdg_action_impact = response?.is_sdg_action_impact;

          setTimeout(() => {
            this.indicatorView = true;
          }, 100);
        },
        error: (err) => {
          console.error(err);
        }
      });
    } else {
      this.indicatorView = true;
    }
  }

  narrativeTypeResult() {
    if (this.activeTab?.planned_result && this.resultLevelId === 1) {
      return 'Indicator(s) of the output selected';
    }

    return `Indicator(s) of the outcome selected`;
  }

  dynamicProgressLabel() {
    if (this.activeTab?.planned_result && this.resultLevelId === 1) return `Progress narrative of the Output`;

    return `Progress narrative of the Outcome`;
  }

  ngOnChanges() {
    this.validateEOI();

    if (this.activeTab?.toc_result_id !== null && this.activeTab?.initiative_id !== null) {
      this.getIndicator();
    }

    this.pushSelectedOptions();
  }

  pushSelectedOptions() {
    if (this.allTabsCreated.length === 1) {
      if (!this.activeTab.planned_result) {
        this.allTabsCreated[0].toc_level_id = 3;
      } else if (this.resultLevelId === 1) {
        this.allTabsCreated[0].toc_level_id = 1;
      } else {
        this.allTabsCreated[0].toc_level_id = 2;
      }
    }

    this.allTabsCreated.forEach((tab) => {
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
    const selectedOption = tab ? this.outputList.find((item) => item.toc_result_id === tab.toc_result_id) : this.outputList.find((item) => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutput = this.selectedOptionsOutput.filter((item) => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutput.push(selectedOption);

    this.outputList = this.outputList.map((item) => {
      const finded = this.selectedOptionsOutput.find((option) => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id);
      item.disabledd = !!finded;
      return item;
    });
  }

  validateSelectedOptionOutCome(tab?: any) {
    const selectedOption = tab ? this.outcomeList.find((item) => item.toc_result_id === tab.toc_result_id) : this.outcomeList.find((item) => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter((item) => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutcome.push(selectedOption);

    this.outcomeList = this.outcomeList.map((item) => {
      const finded = this.selectedOptionsOutcome.find((option) => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id);
      item.disabledd = !!finded;
      return item;
    });
  }

  validateSelectedOptionEOI(tab?: any) {
    const selectedOption = tab ? this.eoiList.find((item) => item.toc_result_id === tab.toc_result_id) : this.eoiList.find((item) => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsEOI = this.selectedOptionsEOI.filter((item) => item.tabId !== selectedOption.tabId);
    this.selectedOptionsEOI.push(selectedOption);

    this.eoiList = this.eoiList.map((item) => {
      const finded = this.selectedOptionsEOI.find((option) => option.toc_result_id === item.toc_result_id);
      item.disabledd = !!finded;
      return item;
    });
  }
}
