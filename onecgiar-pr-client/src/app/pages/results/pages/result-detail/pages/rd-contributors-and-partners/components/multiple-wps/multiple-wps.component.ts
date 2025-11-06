import { Component, Input, OnChanges, OnInit, WritableSignal, computed, effect, inject } from '@angular/core';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';

import { FieldsManagerService } from '../../../../../../../../shared/services/fields-manager.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-change/rd-theory-of-changes-services.service';

interface Tab {
  action_area_outcome_id: number | null;
  created_by: number | null;
  created_date: string | null;
  initiative_id: number | null;
  is_active: number | null;
  last_updated_by: number | null;
  last_updated_date: string | null;
  name: string | null;
  official_code: string | null;
  planned_result: number | null;
  result_toc_result_id: string | null;
  results_id: string | null;
  short_name: string | null;
  toc_level_id: number | null;
  toc_result_id: number | null;
  uniqueId: string | null;
}

@Component({
  selector: 'app-multiple-wps',
  templateUrl: './multiple-wps.component.html',
  styleUrls: ['./multiple-wps.component.scss'],
  standalone: false
})
export class CPMultipleWPsComponent implements OnChanges {
  @Input() editable: boolean;
  @Input() initiative: WritableSignal<any>;
  @Input() isContributor?: boolean = false;
  @Input() isNotifications?: boolean = false;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() showMultipleWPsContent: boolean = true;
  activeTab: Tab;
  activeTabIndex: number = 0;

  currentPlannedResult = null;
  outcomeList = [];
  outputList = [];
  eoiList = [];
  selectedOptionsOutput = [];
  selectedOptionsOutcome = [];
  selectedOptionsEOI = [];
  indicatorsList = [];

  fieldsManagerSE = inject(FieldsManagerService);

  constructor(
    public api: ApiService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService,
    private customizedAlertsFeSE: CustomizedAlertsFeService
  ) {}

  onChangesInitiative = effect(() => {
    if (!this.initiative()?.initiative_id) return;
    this.GET_outcomeList();
    this.GET_outputList();
    this.GET_EOIList();
    this.currentPlannedResult = this.initiative()?.planned_result;
  });

  ngOnChanges() {
    this.initiative()?.result_toc_results.forEach((tab: any, index: number) => {
      tab.uniqueId = index.toString();
    });

    if (this.currentPlannedResult !== null) {
      if (this.initiative()?.planned_result !== this.currentPlannedResult) {
        this.selectedOptionsOutput = [];
        this.selectedOptionsOutcome = [];
        this.selectedOptionsEOI = [];
        this.currentPlannedResult = this.activeTab?.planned_result;
      }
    }

    // Restore active tab from saved index or default to first tab
    const savedIndex = this.theoryOfChangesServices.savedActiveTabIndex;
    if (savedIndex !== null && savedIndex >= 0 && savedIndex < this.initiative()?.result_toc_results.length) {
      this.activeTabIndex = savedIndex;
      this.activeTab = this.initiative()?.result_toc_results[savedIndex];
    } else {
      this.activeTabIndex = 0;
      this.activeTab = this.initiative()?.result_toc_results[0];
    }
  }

  GET_outputList() {
    this.api.tocApiSE
      .GET_tocLevelsByconfig(
        this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id,
        this.initiative()?.initiative_id,
        1,
        this.fieldsManagerSE.isP25()
      )
      .subscribe({
        next: ({ response }) => {
          this.outputList = response;
        },
        error: err => {
          this.outputList = [];
          console.error(err);
        }
      });
  }

  GET_outcomeList() {
    this.api.tocApiSE
      .GET_tocLevelsByconfig(
        this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id,
        this.initiative()?.initiative_id,
        2,
        this.fieldsManagerSE.isP25()
      )
      .subscribe({
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
    this.api.tocApiSE
      .GET_tocLevelsByconfig(
        this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id,
        this.initiative()?.initiative_id,
        3,
        this.fieldsManagerSE.isP25()
      )
      .subscribe({
        next: ({ response }) => {
          response.forEach((item, index) => {
            item.uniqueId = `${item.toc_result_id}-${index}`;
          });
          this.eoiList = response;
        },
        error: err => {
          this.eoiList = [];
          console.error(err);
        }
      });
  }

  dynamicTabTitle = computed(() => {
    if (this.api.dataControlSE?.currentResultSignal().result_level_id) return 'HLO';
    if (this.api.dataControlSE?.currentResultSignal().result_level_id) return 'Outcome';
    return ``;
  });

  getGridTemplateColumns() {
    return `repeat(${this.initiative()?.result_toc_results.length}, 1fr)`;
  }

  completnessStatusValidation(tab) {
    if (this.resultLevelId === 1) {
      return tab.toc_result_id !== null;
    }

    return tab.toc_level_id !== null && tab.toc_result_id !== null;
  }

  getMaxNumberOfTabs(plannedResult: boolean, resultLevelId: number | string): number {
    let uniqueWorkPackageIds = new Set<number | string>();

    if (resultLevelId === 1) {
      if (plannedResult) {
        uniqueWorkPackageIds = new Set(this.outputList.map(item => item.work_package_id));
      } else {
        uniqueWorkPackageIds = new Set(this.eoiList.map(item => item.toc_result_id));
      }
    } else if (resultLevelId === 2) {
      if (plannedResult) {
        const uniqueWorkPackageIdsOutcome = new Set(this.outcomeList.map(item => item.work_package_id));
        const uniqueWorkPackageIdsEOI = new Set(this.eoiList.map(item => item.toc_result_id));
        uniqueWorkPackageIds = new Set([...uniqueWorkPackageIdsOutcome, ...uniqueWorkPackageIdsEOI]);
      } else {
        uniqueWorkPackageIds = new Set(this.eoiList.map(item => item.toc_result_id));
      }
    }

    return uniqueWorkPackageIds.size;
  }

  onActiveTab(tab: any, index: number) {
    this.activeTabIndex = index;
    this.activeTab = tab;
    // Save active tab index
    this.theoryOfChangesServices.savedActiveTabIndex = index;
    this.showMultipleWPsContent = false;

    setTimeout(() => {
      this.showMultipleWPsContent = true;
    }, 50);
  }

  onAddTab() {
    const tocLevelId = !this.initiative().planned_result ? 3 : this.resultLevelId === 1 ? 1 : 2;
    const newIndex = this.initiative().result_toc_results.length;

    this.initiative().result_toc_results.push({
      action_area_outcome_id: null,
      initiative_id: this.initiative().initiative_id,
      official_code: this.initiative().official_code,
      planned_result: this.initiative().planned_result,
      results_id: null,
      short_name: this.initiative().short_name,
      toc_level_id: tocLevelId,
      toc_result_id: null,
      uniqueId: newIndex.toString(),
      related_node_id: null,
      toc_progressive_narrative: null,
      indicators: [{ related_node_id: null, targets: [{ contributing_indicator: null }] }]
    });

    const lastIndex = this.initiative().result_toc_results.length - 1;
    this.onActiveTab(this.initiative().result_toc_results[lastIndex], lastIndex);
  }

  onDeleteTab(tab: Tab, tabNumber = 0) {
    const confirmationMessage = `Are you sure you want to delete contribution TOC-${this.initiative()?.planned_result && this.resultLevelId === 1 ? 'Output' : 'Outcome'} N° ${tabNumber} to the TOC?`;

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
    const isLastTab = this.initiative().result_toc_results.length === 1;
    const isOutputTab = tab.toc_level_id === 1;
    const isOutcomeTab = tab.toc_level_id === 2;
    const isEOITab = tab.toc_level_id === 3;

    if (isLastTab) {
      return;
    }

    if (this.isNotifications) return;

    this.initiative().result_toc_results = this.initiative().result_toc_results.filter(t => t.uniqueId !== tab.uniqueId);

    // Recalculate uniqueId after deletion
    this.initiative().result_toc_results.forEach((t: any, index: number) => {
      t.uniqueId = index.toString();
    });

    this.activeTabIndex = 0;
    this.activeTab = this.initiative()?.result_toc_results[0];
    this.theoryOfChangesServices.savedActiveTabIndex = 0;

    if (this.isContributor) {
      this.theoryOfChangesServices.theoryOfChangeBody.contributors_result_toc_result[this.initiative().index].result_toc_results =
        this.initiative().result_toc_results;
    } else {
      this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result.result_toc_results = this.initiative().result_toc_results;
    }

    if (isOutputTab) {
      this.deleteSelectedOptionOutPut(tab);
    }

    if (isOutcomeTab) {
      this.deleteSelectedOptionOutCome(tab);
    }

    if (isEOITab) {
      this.deleteSelectedOptionEOI(tab);
    }
  }

  deleteSelectedOptionOutPut(tab: any) {
    this.selectedOptionsOutput = this.selectedOptionsOutput.filter(item => item.toc_result_id !== tab?.toc_result_id);

    this.outputList = this.outputList.map(item => {
      const found = this.selectedOptionsOutput.find(option => option.work_package_id === item.work_package_id);
      item.disabledd = !!found;
      return item;
    });
  }

  deleteSelectedOptionOutCome(tab: any) {
    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter(item => item.toc_result_id !== tab?.toc_result_id);
    this.outcomeList = this.outcomeList.map(item => {
      const found = this.selectedOptionsOutcome.find(option => option.work_package_id === item.work_package_id);
      item.disabledd = !!found;
      return item;
    });
  }

  deleteSelectedOptionEOI(tab: any) {
    this.selectedOptionsEOI = this.selectedOptionsEOI.filter(item => item.toc_result_id !== tab?.toc_result_id);
    this.eoiList = this.eoiList.map(item => {
      const found = this.selectedOptionsEOI.find(option => option.uniqueId === item.uniqueId);
      item.disabledd = !!found;
      return item;
    });
  }
}
