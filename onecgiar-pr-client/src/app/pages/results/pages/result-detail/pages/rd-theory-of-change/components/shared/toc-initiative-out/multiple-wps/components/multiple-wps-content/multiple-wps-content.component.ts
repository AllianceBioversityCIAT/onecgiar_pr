import { Component, Input, OnChanges } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../../../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../../rd-theory-of-changes-services.service';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';

@Component({
    selector: 'app-multiple-wps-content',
    templateUrl: './multiple-wps-content.component.html',
    styleUrls: ['./multiple-wps-content.component.scss'],
    standalone: false
})
export class MultipleWPsContentComponent implements OnChanges {
  @Input() editable: boolean;
  @Input() activeTab: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() showMultipleWPsContent: boolean = true;
  @Input() initiative: any;
  @Input() allTabsCreated = [];
  @Input() outcomeList = [];
  @Input() outputList = [];
  @Input() eoiList = [];

  @Input() selectedOptionsOutput = [];
  @Input() selectedOptionsOutcome = [];
  @Input() selectedOptionsEOI = [];

  indicatorView = false;

  constructor(
    public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService,
    public api: ApiService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService,
    public mappedResultService: MappedResultsModalServiceService
  ) {}

  ngOnChanges() {
    if (this.showMultipleWPsContent) {
      if (
        (this.resultLevelId === 1 && this.outputList.length > 0 && this.eoiList.length > 0) ||
        (this.resultLevelId === 2 && this.outcomeList.length > 0 && this.eoiList.length > 0)
      ) {
        if (this.activeTab?.toc_result_id && this.activeTab?.initiative_id && !this.activeTab?.indicators?.length) {
          this.getIndicator();
        }
      }
      this.pushSelectedOptions();
    }
  }

  getIndicator() {
    this.indicatorView = false;

    this.api.resultsSE.Get_indicator(this.activeTab?.toc_result_id, this.activeTab?.initiative_id).subscribe({
      next: ({ response }) => {
        this.activeTab.indicators = response?.informationIndicator;
        this.activeTab.impactAreasTargets = response?.impactAreas.map(item => ({
          ...item,
          full_name: `<strong>${item.name}</strong> - ${item.target}`
        }));
        this.activeTab.sdgTargest = response?.sdgTargets.map(item => ({
          ...item,
          full_name: `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`
        }));

        const getText = (actionAreaId: number) => {
          if (actionAreaId === 1) return '<strong>Systems Transformation</strong>';
          if (actionAreaId === 2) return '<strong>Resilient Agrifood Systems</strong>';
          return '<strong>Genetic Innovation</strong>';
        };
        this.activeTab.actionAreaOutcome = response?.actionAreaOutcome.map(item => ({
          ...item,
          full_name: `${getText(item.actionAreaId)} (${item.outcomeSMOcode}) - ${item.outcomeStatement}`
        }));
        this.activeTab.is_sdg_action_impact = response?.is_sdg_action_impact;
        this.activeTab.wpinformation = response?.wpinformation;
        this.activeTab.wpinformation.wpTitle = response.wpinformation?.extraInformation?.wp_acronym
          ? `<strong>${response.wpinformation?.extraInformation?.wp_acronym}</strong> <br> <div class="select_item_description">${response.wpinformation?.extraInformation?.result_title}</div>`
          : `<strong>${response.wpinformation?.extraInformation?.result_title}</strong>`;

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
    if (this.activeTab?.planned_result && this.resultLevelId === 1) {
      return 'Indicator(s) of the output selected';
    }

    return `Indicator(s) of the outcome selected`;
  }

  dynamicProgressLabel() {
    if (this.activeTab?.planned_result && this.resultLevelId === 1) return `Progress narrative of the Output`;

    return `Progress narrative of the Outcome`;
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
    const selectedOption = tab
      ? this.outputList.find(item => item.toc_result_id === tab.toc_result_id)
      : this.outputList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutput = this.selectedOptionsOutput.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutput.push(selectedOption);

    this.outputList = this.outputList.map(item => {
      const finded = this.selectedOptionsOutput.find(
        option => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id
      );
      item.disabledd = !!finded;
      return item;
    });
  }

  validateSelectedOptionOutCome(tab?: any) {
    const selectedOption = tab
      ? this.outcomeList.find(item => item.toc_result_id === tab.toc_result_id)
      : this.outcomeList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutcome.push(selectedOption);

    this.outcomeList = this.outcomeList.map(item => {
      const finded = this.selectedOptionsOutcome.find(
        option => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id
      );
      item.disabledd = !!finded;
      return item;
    });
  }

  validateSelectedOptionEOI(tab?: any) {
    const selectedOption = tab
      ? this.eoiList.find(item => item.toc_result_id === tab.toc_result_id)
      : this.eoiList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

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

  dynamicMappedResultButtonText() {
    return `See all results contributing to this TOC ${this.activeTab?.planned_result && this.resultLevelId === 1 ? 'Output' : 'Outcome'}`;
  }

  openMappedResultsModal() {
    this.mappedResultService.mappedResultsModal = true;
    this.mappedResultService.columnsOrder = [
      { title: 'Result code', attr: 'result_code' },
      { title: 'Title', attr: 'title', link: true },
      { title: 'Indicator category', attr: 'result_type_name' },
      { title: 'Phase', attr: 'phase_name' },
      { title: 'Progress narrative against the target', attr: 'toc_progressive_narrative' }
    ];
  }

  showNarrative(): boolean {
    if (this.resultLevelId === 2 || (this.resultLevelId === 1 && !this.activeTab?.planned_result)) return true;

    if (!this.activeTab?.indicators) {
      return false;
    }

    return this.activeTab.indicators.some(indicator => {
      return indicator.targets?.some(target => target.indicator_question === false);
    });
  }
}
