import { Injectable } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class MultipleWPsServiceService {
  activeTab: any;
  allTabs: any = [];
  outcomeList = [];
  outputList = [];
  eoiList = [];
  selectedOptionsOutput = [];
  selectedOptionsOutcome = [];
  selectedOptionsEOI = [];

  constructor(public api: ApiService) {}

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.activeTab?.results_id || this.api.dataControlSE?.currentResult?.id, this.activeTab?.initiative_id, 1).subscribe({
      next: ({ response }) => {
        this.outputList = response;
        this.pushSelectedOptions(this.allTabs);
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
        this.pushSelectedOptions(this.allTabs);
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
        response.forEach((item, index) => {
          item.uniqueId = `${item.toc_result_id}-${index}`;
        });
        this.eoiList = response;
        this.pushSelectedOptions(this.allTabs);
      },
      error: err => {
        this.eoiList = [];
        console.error(err);
      }
    });
  }

  getMaxNumberOfTabs(planned_result: boolean, resultLevelId: number | string) {
    let uniqueWorkPackageIds = new Set();

    if (resultLevelId === 1 && planned_result) {
      uniqueWorkPackageIds = new Set(this?.outputList.map(item => item.work_package_id));
    } else {
      const uniqueWorkPackageIdsOutcome = new Set(this?.outcomeList.map(item => item.work_package_id));
      const uniqueWorkPackageIdsEOI = new Set(this?.eoiList.map(item => item.toc_result_id));
      uniqueWorkPackageIds = new Set([...Array.from(uniqueWorkPackageIdsOutcome), ...Array.from(uniqueWorkPackageIdsEOI)]);
    }

    if (!planned_result) {
      uniqueWorkPackageIds = new Set(this?.eoiList.map(item => item.uniqueId));
    }

    return uniqueWorkPackageIds.size;
  }

  pushSelectedOptions(allTabs) {
    allTabs.forEach(tab => {
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

  deleteSelectedOptionOutPut(tab) {
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

  validateSelectedOptionOutPut(tab?: any) {
    const selectedOption = tab ? this.outputList.find(item => item.toc_result_id === tab.toc_result_id) : this.outputList.find(item => item.toc_result_id === this.activeTab?.toc_result_id);

    if (!selectedOption) return;

    selectedOption.tabId = tab?.uniqueId ?? this.activeTab?.uniqueId;

    this.selectedOptionsOutput = this.selectedOptionsOutput.filter(item => item.tabId !== selectedOption.tabId);
    this.selectedOptionsOutput.push(selectedOption);

    this.outputList = this.outputList.map(item => {
      const finded = this.selectedOptionsOutput.find(option => option.work_package_id === item.work_package_id);
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
      const finded = this.selectedOptionsOutcome.find(option => option.work_package_id === item.work_package_id);
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
