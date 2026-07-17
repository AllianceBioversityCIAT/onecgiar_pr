import { Component, EventEmitter, Input, OnChanges, Output, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { TocInitiativeOutcomeListsService } from '../../../../../rd-theory-of-change/components/toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { RdTheoryOfChangesServicesService } from '../../../../../rd-theory-of-change/rd-theory-of-changes-services.service';
import { ResultLevelService } from '../../../../../../../../../../pages/results/pages/result-creator/services/result-level.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';

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
  rdPartnersSE = inject(RdContributorsAndPartnersService);
  resultLevelIdSignal = signal<number | string | undefined>(undefined);
  indicatorsList = signal<any[]>([]);
  indicatorView = false;
  showIndicators = signal<boolean>(false);
  selectedIndicatorData = signal<IndicatorItem | null>(null);

  // P2-2998: reactive trigger for syncTocReferenceIds. `allTabsCreated` is a plain @Input() array whose
  // in-place mutations (HLO/Outcome or KPI selection) don't notify the effect. Bumping this signal from the
  // selection handlers forces the centers reference set to recompute on selection, not only on tab switch.
  selectionVersion = signal<number>(0);

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

  // P2-3063 (L3): read-only statement of the selected HLO/Intermediate Outcome/2030 Outcome node.
  // The data already comes from the TOC control list (Juan David's enrichment, df27cc55a): each node carries
  // `outcome_statement` (mapped from the TOC board `description`). We find the selected node by toc_result_id
  // in the list that matches the chosen level (1=output, 2=outcome, 3=eoi), mirroring updateSelectedIndicatorData().
  private selectedTocNode = computed(() => {
    const id = this.activeTabSignal()?.toc_result_id ?? this.activeTab?.toc_result_id;
    if (id === null || id === undefined) return null;
    switch (this.activeTabSignal()?.toc_level_id) {
      case 3:
        return this.eoiList().find((item: any) => item.toc_result_id === id) ?? null;
      case 2:
        return this.outcomeList().find((item: any) => item.toc_result_id === id) ?? null;
      case 1:
        return this.outputList().find((item: any) => item.toc_result_id === id) ?? null;
    }
    return null;
  });

  // Label mirrors the chosen level name ("High Level Output" / "Intermediate Outcome" / "2030 Outcome") + " Statement".
  hloStatementLabel = computed(() => {
    const levelName = this.secondFieldLabel();
    return levelName ? `${levelName} Statement` : '';
  });

  hloStatementValue = computed(() => {
    const node: any = this.selectedTocNode();
    return node?.outcome_statement ?? node?.description ?? '';
  });

  hloStatementTooltip = computed(() => (this.isCP2026() ? 'Maps to TOC: Output or Outcome statement' : ''));

  // P2-3063 (L3): read-only Indicator Typology = the "Type" of the selected KPI in TOC.
  // Comes as `indicator_typology` (alias of `type_value`) on the selected indicator (Juan David's enrichment df27cc55a).
  // `selectedIndicatorData()` already holds the selected indicator (set by updateSelectedIndicatorData()).
  indicatorTypologyValue = computed(() => {
    const ind: any = this.selectedIndicatorData();
    return ind?.indicator_typology ?? ind?.type_value ?? '';
  });

  indicatorTypologyTooltip = computed(() => (this.isCP2026() ? 'Maps to TOC: [Type]' : ''));

  onChangesActiveTab = effect(() => {
    this.getIndicatorsList();
  });

  // P2-2998 / P2-2929 (2026): feed the parent the institutionIds / initiative-ids referenced by the TOC.
  // Per Juan David: the front applies NO precedence logic (the backend resolves the 4 KPI/HLO scenarios); it just
  // UNIONS + dedupes across ALL selected nodes/tabs:
  //   - Centers  = toc_partners (per node) ∪ toc_target_center_ids (per selected indicator)  → cross CLARISA by institutionId
  //   - Science Programs = contributing_synergy_program_initiative_ids (per node)            → cross /clarisa/initiatives by id
  // Visual layer only. SAVE NOT ADDRESSED YET.
  syncTocReferenceIds = effect(() => {
    if (!this.isCP2026()) return;
    // dependencies: lists + active tab signal (re-run on load and on selection changes)
    const out = this.outputList();
    const oc = this.outcomeList();
    const eoi = this.eoiList();
    this.activeTabSignal();
    // P2-2998: subscribe to in-tab HLO/KPI selection changes (see selectionVersion + getIndicatorsList/mapTocResultsIndicatorId).
    this.selectionVersion();
    const tabs: any[] = this.allTabsCreated ?? [];
    const listForLevel = (lvl: any): any[] => {
      if (lvl === 3) return eoi;
      if (lvl === 2) return oc;
      if (lvl === 1) return out;
      return [];
    };
    const num = (v: any) => Number(v);
    const centerIds = new Set<number>();
    const synergyIds = new Set<number>();
    // P2-3066: toc_partners holds ALL partners (centers + external). We feed them to both center and partner sets;
    // each consumer cross-references its own catalog (centers list vs institutions-without-centers list) to keep only its own.
    const partnerIds = new Set<number>();
    for (const tab of tabs) {
      const node: any = listForLevel(tab?.toc_level_id)?.find((n: any) => n.toc_result_id === tab?.toc_result_id);
      if (!node) continue;
      (node.toc_partners ?? []).forEach((p: any) => {
        const n = num(p?.code);
        if (!Number.isNaN(n)) {
          centerIds.add(n);
          partnerIds.add(n);
        }
      });
      (node.contributing_synergy_program_initiative_ids ?? []).forEach((id: any) => { const n = num(id); if (!Number.isNaN(n)) synergyIds.add(n); });
      const indId = tab?.indicators?.[0]?.related_node_id;
      const ind: any = (node.indicators ?? []).find((i: any) => i.related_node_id === indId);
      (ind?.toc_target_center_ids ?? []).forEach((id: any) => { const n = num(id); if (!Number.isNaN(n)) centerIds.add(n); });
    }
    this.rdPartnersSE.tocReferenceCenterInstitutionIds.set(Array.from(centerIds));
    this.rdPartnersSE.tocReferenceSynergyInitiativeIds.set(Array.from(synergyIds));
    this.rdPartnersSE.tocReferencePartnerInstitutionIds.set(Array.from(partnerIds));
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
    const filterIndicators = (list: any[]) => {
      if (!list.length) return;
      const itemSelected = list.find((item: any) => item.toc_result_id === this.activeTab.toc_result_id);
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
    // P2-2998: HLO/Outcome node changed → recompute the centers reference set now (don't wait for a tab switch).
    this.selectionVersion.update(v => v + 1);
  }

  // P2-3115: called ONLY from the template (ngModelChange) on the HLO/KPI dropdowns, so it fires on genuine user
  // selection (not on the load-time getIndicatorsList() driven by the onChangesActiveTab effect). This authorizes the
  // parent's ToC prefill to (re)populate the chips — a deliberate user action, unlike a cold reload.
  markUserTocSelection() {
    if (this.isCP2026()) this.rdPartnersSE.tocSelectionTouched.set(true);
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
    // P2-2998: KPI Statement changed → union the indicator's toc_target_center_ids into the centers reference set now.
    this.selectionVersion.update(v => v + 1);
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

    return this.activeTab.indicators.some((indicator: any) => {
      return indicator.targets?.some((target: any) => target.indicator_question === false);
    });
  }
}
