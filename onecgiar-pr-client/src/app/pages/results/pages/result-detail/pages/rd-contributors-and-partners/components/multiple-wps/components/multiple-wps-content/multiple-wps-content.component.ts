import { Component, EventEmitter, Input, OnChanges, OnInit, Output, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from '../../../../../rd-theory-of-change/components/toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { RdTheoryOfChangesServicesService } from '../../../../../rd-theory-of-change/rd-theory-of-changes-services.service';
import { ResultLevelService } from '../../../../../../../../../../pages/results/pages/result-creator/services/result-level.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';

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
  @Input() isUnplanned: boolean = false;
  @Input() hidden: boolean = false;
  @Input() isAvisa: boolean = false;
  @Input() allTabsCreated = [];
  @Input() outcomeList: WritableSignal<any[]>;
  @Input() outputList: WritableSignal<any[]>;
  @Input() eoiList: WritableSignal<any[]>;
  @Input() activeTabSignal: any;

  @Input() selectedOptionsOutput = [];
  @Input() selectedOptionsOutcome = [];
  @Input() selectedOptionsEOI = [];
  @Output() tocResultChanged = new EventEmitter<void>();
  reusltlevelSE = inject(ResultLevelService);
  fieldsManagerSE = inject(FieldsManagerService);
  resultLevelIdSignal = signal<number | string | undefined>(undefined);
  indicatorsList = signal<any[]>([]);
  indicatorView = false;
  showIndicators = signal<boolean>(false);
  selectedIndicatorData = signal<IndicatorItem | null>(null);

  secondFieldLabel = computed(() => {
    return this.tocResultListFiltered().find(item => item.toc_level_id === this.activeTabSignal()?.toc_level_id)?.name;
  });

  // P2-3036: the 2026 redesign (labels/help/wording) applies only to phase 2026+. 2025 keeps the legacy copy.
  isCP2026 = computed(() => this.fieldsManagerSE.isContributorsPartners2026());

  indicatorLabel = computed(() => (this.isCP2026() ? 'KPI Statement/description' : 'Indicator'));

  indicatorHelp = computed(() => (this.isCP2026() ? 'Maps to TOC: [KPI Statement – deliverable short name and indicator description]' : ''));

  contributionTargetNote = computed(() =>
    this.isCP2026()
      ? 'Indicate the numerical value that this result contributes toward the 2026 indicator target, using the same unit of measurement as the indicator itself.<br><br><strong>Examples:</strong> If the indicator measures number of farmers, enter the number of farmers reached or benefiting from this result. If the indicator measures USD invested or leveraged, enter the corresponding monetary value. If the indicator measures number of workshops, trainings, or events, enter the number delivered. Apply the same logic for any other unit of measurement specified by the indicator.<br><br>If you are reporting a Knowledge Product and have mapped it to a TOC KPI/indicator, enter <strong>1</strong> as the contribution to target. If the KP does not count independently toward the yearly target — for example, because it serves as a complementary result supporting the achievement of another result that carries the count — enter <strong>0</strong>.<br><br>Values entered here will be aggregated across results at the end of the reporting cycle to assess progress toward the planned 2026 KPIs and indicator targets.'
      : 'Indicate in this box the numerical value that your result contributes toward the 2025 target of the indicator.<br><br><strong>Example:</strong> If the 2025 indicator target is 200 (people trained) and your result (e.g., a capacity-sharing activity) provides evidence of 90 people trained, enter <strong>90</strong> in this box.<br><br>The values entered here will be aggregated at the end of the reporting cycle to assess progress toward the planned 2025 target for the indicator.'
  );

  onChangesActiveTab = effect(() => {
    this.getIndicatorsList();
  });

  ngOnChanges(): void {
    if (this.resultLevelId !== undefined && this.resultLevelId !== null) {
      this.resultLevelIdSignal.set(this.resultLevelId);
    }
    this.pushSelectedOptions();
    this.updateSelectedIndicatorData();
  }

  setActiveTabSignal() {
    const currentTab = this.activeTabSignal();
    this.activeTabSignal.set({
      ...currentTab,
      toc_level_id: this.activeTab.toc_level_id
    });
  }

  private static readonly AVISA_LEVEL_NAMES: Record<number, string> = {
    1: 'Output',
    2: 'Intermediate Outcome',
    3: 'End-of-Initiative Outcome'
  };

  tocResultListFiltered = computed(() => {
    const list = this.tocInitiativeOutcomeListsSE.tocResultList();

    if (this.isAvisa) {
      return list.map(item => ({
        ...item,
        name: CPMultipleWPsContentComponent.AVISA_LEVEL_NAMES[item.toc_level_id] ?? item.name
      }));
    }

    if (this.isIpsr) {
      return list.filter(item => item.toc_level_id !== 1);
    }

    const inputLevel = this.resultLevelIdSignal();
    const effectiveLevel =
      inputLevel === 3 || inputLevel === 4 || inputLevel === '3' || inputLevel === '4'
        ? Number(inputLevel)
        : this.reusltlevelSE.currentResultLevelIdSignal();

    switch (effectiveLevel) {
      case 3:
        return list.filter(item => item.toc_level_id !== 1);
      case 4:
        return list.filter(item => item.toc_level_id == 1);
    }
    return list;
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
      this.fieldsManagerSE.activeIndicatorsLength.set(this.indicatorsList().length);

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
    this.fieldsManagerSE.hasSelectedIndicator.set(false);

    setTimeout(() => {
      this.showIndicators.set(true);
    }, 100);
  }

  mapTocResultsIndicatorId() {
    this.fieldsManagerSE.hasSelectedIndicator.set(true);
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
    this.allTabsCreated?.forEach(tab => {
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
