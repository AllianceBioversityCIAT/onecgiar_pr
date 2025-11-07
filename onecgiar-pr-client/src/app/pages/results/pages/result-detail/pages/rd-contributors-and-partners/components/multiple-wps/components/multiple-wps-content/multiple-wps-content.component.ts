import { Component, Input, OnChanges, OnInit, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from '../../../../../rd-theory-of-change/components/toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { RdTheoryOfChangesServicesService } from '../../../../../rd-theory-of-change/rd-theory-of-changes-services.service';
import { ResultLevelService } from '../../../../../../../../../../pages/results/pages/result-creator/services/result-level.service';

interface TocResultItem {
  toc_result_id: string;
  indicators?: IndicatorItem[];
}

interface IndicatorItem {
  related_node_id: string;
  unit_messurament?: string;
  targets?: TargetItem[];
}

interface TargetItem {
  target_value?: number;
}

@Component({
  selector: 'app-multiple-wps-content',
  templateUrl: './multiple-wps-content.component.html',
  styleUrls: ['./multiple-wps-content.component.scss'],
  standalone: false
})
export class CPMultipleWPsContentComponent implements OnChanges {
  @Input() editable: boolean;
  @Input() activeTab: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() showMultipleWPsContent: boolean = true;
  @Input() allTabsCreated = [];
  @Input() outcomeList: WritableSignal<any[]>;
  @Input() outputList: WritableSignal<any[]>;
  @Input() eoiList: WritableSignal<any[]>;
  @Input() activeTabSignal: any;

  @Input() selectedOptionsOutput = [];
  @Input() selectedOptionsOutcome = [];
  @Input() selectedOptionsEOI = [];
  reusltlevelSE = inject(ResultLevelService);
  indicatorsList = signal<any[]>([]);
  indicatorView = false;
  showIndicators = signal<boolean>(false);
  selectedIndicatorData = signal<IndicatorItem | null>(null);

  secondFieldLabel = computed(() => {
    return this.tocResultListFiltered().find(item => item.toc_level_id === this.activeTabSignal()?.toc_level_id)?.name;
  });

  onChangesActiveTab = effect(() => {
    this.getIndicatorsList();
  });

  ngOnChanges(): void {
    this.pushSelectedOptions();
    this.updateSelectedIndicatorData();
  }

  setActiveTabSignal() {
    this.activeTabSignal.update(prev => {
      return { ...prev, toc_level_id: this.activeTab.toc_level_id };
    });
  }

  tocResultListFiltered = computed(() => {
    switch (this.reusltlevelSE.currentResultLevelIdSignal()) {
      case 3:
        return this.tocInitiativeOutcomeListsSE.tocResultList().filter(item => item.toc_level_id !== 1);
      case 4:
        return this.tocInitiativeOutcomeListsSE.tocResultList().filter(item => item.toc_level_id == 1);
    }
    return this.tocInitiativeOutcomeListsSE.tocResultList();
  });

  constructor(
    public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService,
    public api: ApiService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService,
    public mappedResultService: MappedResultsModalServiceService
  ) {}

  getIndicatorsList() {
    const filterIndicators = list => {
      if (!list.length) return;
      const itemSelected = list.find(item => item.toc_result_id === this.activeTab.toc_result_id);
      this.indicatorsList.set(itemSelected?.indicators || []);
      this.activeTab.indicators[0].related_node_id = this.activeTab.indicators[0].toc_results_indicator_id;
      if (!this.activeTab.toc_progressive_narrative) this.activeTab.toc_progressive_narrative = '';
    };
    switch (this.activeTabSignal()?.toc_level_id) {
      case 3:
        filterIndicators(this.eoiList());
        break;
      case 2:
        filterIndicators(this.outcomeList());
        break;
      case 1:
        filterIndicators(this.outputList());
        break;
    }
    this.hideIndicators();
    this.updateSelectedIndicatorData();
  }

  hideIndicators() {
    this.showIndicators.set(false);
    setTimeout(() => {
      this.showIndicators.set(true);
    }, 100);
  }

  mapTocResultsIndicatorId() {
    this.activeTab.indicators[0].toc_results_indicator_id = this.activeTab.indicators[0].related_node_id;
    this.updateSelectedIndicatorData();
  }

  updateSelectedIndicatorData() {
    let selectedOption: TocResultItem | undefined = undefined;
    switch (this.activeTabSignal()?.toc_level_id) {
      case 3:
        selectedOption = this.eoiList().find((item: TocResultItem) => item.toc_result_id === this.activeTab?.toc_result_id);
        break;
      case 2:
        selectedOption = this.outcomeList().find((item: TocResultItem) => item.toc_result_id === this.activeTab?.toc_result_id);
        break;
      case 1:
        selectedOption = this.outputList().find((item: TocResultItem) => item.toc_result_id === this.activeTab?.toc_result_id);
        break;
    }

    if (!selectedOption || !this.activeTab?.indicators?.[0]?.related_node_id) {
      this.selectedIndicatorData.set(null);
      return;
    }

    const selectedIndicator: IndicatorItem | undefined = selectedOption.indicators?.find(
      (indicator: IndicatorItem) => indicator.related_node_id === this.activeTab.indicators[0].related_node_id
    );

    this.selectedIndicatorData.set(selectedIndicator || null);
  }

  narrativeTypeResult() {
    if (this.activeTab?.planned_result && this.resultLevelId === 1) {
      return 'Indicator(s) of the output selected';
    }

    return `Indicator(s) of the outcome selected`;
  }

  dynamicProgressLabel = computed(() => {
    return `Progress narrative of the ${this.secondFieldLabel()}`;
  });

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
      ? this.outputList().find(item => item.toc_result_id === tab.toc_result_id)
      : this.outputList().find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutput = this.selectedOptionsOutput.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutput.push(selectedOption);

    this.outputList.update(prev => {
      return prev.map(item => {
        const finded = this.selectedOptionsOutput.find(
          option => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id
        );
        item.disabledd = !!finded;
        return item;
      });
    });
  }

  validateSelectedOptionOutCome(tab?: any) {
    const selectedOption = tab
      ? this.outcomeList().find(item => item.toc_result_id === tab.toc_result_id)
      : this.outcomeList().find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutcome.push(selectedOption);

    this.outcomeList.update(prev => {
      return prev.map(item => {
        const finded = this.selectedOptionsOutcome.find(
          option => option.tabId !== this.activeTab.uniqueId && option.work_package_id === item.work_package_id
        );
        item.disabledd = !!finded;
        return item;
      });
    });
  }

  validateSelectedOptionEOI(tab?: any) {
    const selectedOption = tab
      ? this.eoiList().find(item => item.toc_result_id === tab.toc_result_id)
      : this.eoiList().find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsEOI = this.selectedOptionsEOI.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsEOI.push(selectedOption);

    this.eoiList.update(prev => {
      return prev.map(item => {
        const finded = this.selectedOptionsEOI.find(option => option.toc_result_id === item.toc_result_id);
        item.disabledd = !!finded;
        return item;
      });
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
