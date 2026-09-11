import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../../../shared/services/fields-manager.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RdContributorsAndPartnersService } from '../../rd-contributors-and-partners.service';
import { TocTab } from '../../../../../../../../shared/interfaces/toc-tab.interface';

@Component({
  selector: 'app-cp-multiple-wps',
  templateUrl: './multiple-wps.component.html',
  styleUrls: ['./multiple-wps.component.scss'],
  standalone: false
})
export class CPMultipleWPsComponent implements OnChanges {
  @Input() editable: boolean;
  @Input() initiative: any;
  @Input() initiativeId: number | null;
  @Input() isContributor?: boolean = false;
  @Input() isNotifications?: boolean = false;
  private readonly _resultLevelId = signal<number | string | null | undefined>(null);
  @Input() set resultLevelId(value: number | string) {
    this._resultLevelId.set(value);
  }
  get resultLevelId(): number | string {
    return this._resultLevelId();
  }
  @Input() isIpsr: boolean = false;
  // P2-3245 / P2-3275: signal-backed input. `onActiveTab()` toggles this flag `false -> setTimeout -> true`
  // to force the content block to remount; as a plain field the second assignment happened outside any
  // notification, so under zoneless change detection the view stayed frozen on `false` and the
  // Level/HLO/KPI form never came back (empty container after "Add other TOC result"). Reading the signal
  // from the template makes that write schedule a render pass on its own. Same shape as the signal-backed
  // inputs in PrTableComponent; see ViewRefreshService for the wider zoneless context.
  private readonly _showMultipleWPsContent = signal<boolean>(true);
  @Input() set showMultipleWPsContent(value: boolean) {
    this._showMultipleWPsContent.set(value);
  }
  get showMultipleWPsContent(): boolean {
    return this._showMultipleWPsContent();
  }
  @Input() isUnplanned: boolean = false;
  @Input() hidden: boolean = false;
  @Input() forceP25: boolean = false;
  @Input() isAvisa: boolean = false;
  @Output() tocResultChanged = new EventEmitter<void>();
  activeTab: TocTab;
  activeTabSignal = signal<TocTab | null>(null);
  activeTabIndex: number = 0;

  currentPlannedResult = null;
  outcomeList = signal<any[]>([]);
  outputList = signal<any[]>([]);
  eoiList = signal<any[]>([]);

  selectedOptionsOutput = [];
  selectedOptionsOutcome = [];
  selectedOptionsEOI = [];
  indicatorsList = [];

  fieldsManagerSE = inject(FieldsManagerService);
  rdPartnersSE = inject(RdContributorsAndPartnersService);
  // P2-3036 L2 (P2-3062): in the 2026 redesign the HLO tab header (chips + add button) is hidden in the No scenario.
  // Gated by isCP2026 so phase 2025 and the other reuse contexts (IPSR, bilateral, share-request) are unaffected.
  isCP2026 = computed(() => this.fieldsManagerSE.isContributorsPartners2026());
  constructor(
    public api: ApiService,
    private readonly customizedAlertsFeSE: CustomizedAlertsFeService
  ) {}

  private fetchListsForInitiative(): void {
    if (!this.initiativeId) return;
    this.GET_outcomeList();
    this.GET_EOIList();
    this.GET_outputList();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initiativeId'] || changes['initiative'] || changes['isUnplanned']) {
      this.fetchListsForInitiative();
    }

    this.initiative?.result_toc_results?.forEach((tab: any, index: number) => {
      tab.uniqueId = index.toString();
    });

    if (this.currentPlannedResult !== null) {
      if (this.initiative?.planned_result !== this.currentPlannedResult) {
        this.selectedOptionsOutput = [];
        this.selectedOptionsOutcome = [];
        this.selectedOptionsEOI = [];
        this.currentPlannedResult = this.activeTab?.planned_result;
      }
    }

    // Restore active tab from saved index or default to first tab
    const savedIndex = this.rdPartnersSE.savedActiveTabIndex;
    if (savedIndex !== null && savedIndex >= 0 && savedIndex < this.initiative?.result_toc_results.length) {
      this.activeTabIndex = savedIndex;
      this.activeTab = this.initiative?.result_toc_results[savedIndex];
      this.activeTabSignal.set(this.activeTab);
    } else {
      this.activeTabIndex = 0;
      this.activeTab = this.initiative?.result_toc_results?.[0];
      this.activeTabSignal.set(this.activeTab);
    }
  }

  GET_outputList() {
    if (!this.initiativeId) return;
    const resultId =
      this.api.dataControlSE.currentNotification?.result_id ||
      this.activeTab?.results_id ||
      this.api.dataControlSE?.currentResult?.id ||
      this.api.dataControlSE.currentResultSignal()?.result_id ||
      this.api.dataControlSE.currentResultSignal()?.id;

    if (!resultId) return;

    const isPlanned = !this.isUnplanned;
    this.api.tocApiSE.GET_tocLevelsByconfig(resultId, this.initiativeId, 1, this.forceP25 ? true : this.fieldsManagerSE.isP25(), isPlanned).subscribe({
      next: ({ response }) => {
        this.outputList.set(response || []);
      },
      error: err => {
        this.outputList.set([]);
        console.error(err);
      }
    });
  }

  GET_outcomeList() {
    if (!this.initiativeId) return;
    const resultId =
      this.api.dataControlSE.currentNotification?.result_id ||
      this.activeTab?.results_id ||
      this.api.dataControlSE?.currentResult?.id ||
      this.api.dataControlSE.currentResultSignal()?.result_id ||
      this.api.dataControlSE.currentResultSignal()?.id;

    if (!resultId) return;

    const isPlanned = !this.isUnplanned;
    this.api.tocApiSE.GET_tocLevelsByconfig(resultId, this.initiativeId, 2, this.forceP25 ? true : this.fieldsManagerSE.isP25(), isPlanned).subscribe({
      next: ({ response }) => {
        this.outcomeList.set(response || []);
      },
      error: err => {
        this.outcomeList.set([]);
        console.error(err);
      }
    });
  }

  GET_EOIList() {
    if (!this.initiativeId) return;
    const resultId =
      this.api.dataControlSE.currentNotification?.result_id ||
      this.activeTab?.results_id ||
      this.api.dataControlSE?.currentResult?.id ||
      this.api.dataControlSE.currentResultSignal()?.result_id ||
      this.api.dataControlSE.currentResultSignal()?.id;

    if (!resultId) return;

    const isPlanned = !this.isUnplanned;
    this.api.tocApiSE.GET_tocLevelsByconfig(resultId, this.initiativeId, 3, this.forceP25 ? true : this.fieldsManagerSE.isP25(), isPlanned).subscribe({
      next: ({ response }) => {
        if (response && Array.isArray(response)) {
          response.forEach((item, index) => {
            item.uniqueId = `${item.toc_result_id}-${index}`;
          });
          this.eoiList.set(response);
        } else {
          this.eoiList.set([]);
        }
      },
      error: err => {
        this.eoiList.set([]);
        console.error(err);
      }
    });
  }

  isOutput = computed(() => {
    const levelId =
      this.api.dataControlSE?.currentResultSignal?.()?.result_level_id ??
      (this.resultLevelId !== undefined && this.resultLevelId !== null ? Number(this.resultLevelId) : null);
    return levelId === 4 || this.resultLevelId === 1 || this.resultLevelId === '1';
  });

  dynamicTabTitle = computed(() => {
    return this.isOutput() ? 'HLO' : 'Outcome';
  });

  getGridTemplateColumns() {
    return `repeat(${this.initiative?.result_toc_results?.length}, 1fr)`;
  }

  completnessStatusValidation(tab) {
    const baseComplete = this.isOutput() ? tab.toc_result_id !== null : tab.toc_level_id !== null && tab.toc_result_id !== null;

    // P2-3171 (AC6): in 2026, when a KPI indicator is selected the "contribution to target" field is mandatory
    // (see multiple-wps-content.component.html), so the tab must not be marked complete (green) while it is empty.
    // Other reuse contexts (2025, IPSR, bilateral, share-request, or no indicator selected) keep the previous behavior.
    const indicatorSelected = tab?.indicators?.[0]?.related_node_id;
    if (this.isCP2026() && indicatorSelected) {
      const contribution = tab?.indicators?.[0]?.targets?.[0]?.contributing_indicator;
      const contributionFilled = contribution !== null && contribution !== undefined && contribution !== '';
      return baseComplete && contributionFilled;
    }

    return baseComplete;
  }

  onActiveTab(tab: any, index: number) {
    this.activeTabIndex = index;
    this.activeTab = tab;
    this.activeTabSignal.set(tab);
    // Save active tab index
    this.rdPartnersSE.savedActiveTabIndex = index;
    this.showMultipleWPsContent = false;

    setTimeout(() => {
      this.showMultipleWPsContent = true;
    }, 50);
  }

  onAddTab() {
    if (!this.initiative?.result_toc_results) this.initiative.result_toc_results = [];
    const newIndex = this.initiative?.result_toc_results.length;
    this.initiative.result_toc_results.push({
      action_area_outcome_id: null,
      initiative_id: this.initiativeId,
      official_code: this.initiative?.official_code,
      planned_result: this.initiative?.planned_result,
      results_id: null,
      short_name: this.initiative?.short_name,
      toc_level_id: null,
      toc_result_id: null,
      uniqueId: newIndex.toString(),
      related_node_id: null,
      toc_progressive_narrative: null,
      indicators: [{ related_node_id: null, targets: [{ contributing_indicator: null }] }]
    });

    const lastIndex = this.initiative?.result_toc_results.length - 1;
    this.onActiveTab(this.initiative?.result_toc_results[lastIndex], lastIndex);
  }

  onDeleteTab(tab: TocTab, tabNumber = 0) {
    const confirmationMessage = `Are you sure you want to delete contribution TOC-${this.initiative?.planned_result && this.isOutput() ? 'Output' : 'Outcome'} N° ${tabNumber} to the TOC?`;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Delete confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, delete'
      },
      () => {
        this.deleteTabLogic(tab);
      }
    );
  }

  deleteTabLogic(tab) {
    const isLastTab = this.initiative?.result_toc_results.length === 1;
    if (isLastTab) {
      return;
    }

    if (this.isNotifications) return;

    this.initiative.result_toc_results = this.initiative?.result_toc_results.filter(t => t.uniqueId !== tab.uniqueId);

    // Recalculate uniqueId after deletion
    this.initiative?.result_toc_results.forEach((t: any, index: number) => {
      t.uniqueId = index.toString();
    });

    this.activeTabIndex = 0;
    this.activeTab = this.initiative?.result_toc_results?.[0];
    this.activeTabSignal.set(this.activeTab);
    this.rdPartnersSE.savedActiveTabIndex = 0;

    if (this.isContributor) {
      this.rdPartnersSE.partnersBody.contributors_result_toc_result[this.initiative?.index].result_toc_results = this.initiative?.result_toc_results;
    } else {
      this.rdPartnersSE.partnersBody.result_toc_result.result_toc_results = this.initiative?.result_toc_results;
    }
  }
}
