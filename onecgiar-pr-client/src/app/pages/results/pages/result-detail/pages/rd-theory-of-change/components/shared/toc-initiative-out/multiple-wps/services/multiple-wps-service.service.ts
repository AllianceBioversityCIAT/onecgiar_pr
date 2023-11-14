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
        this.eoiList = response;
        this.pushSelectedOptions(this.allTabs);
      },
      error: err => {
        this.eoiList = [];
        console.error(err);
      }
    });
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
      const finded = this.selectedOptionsOutput.find(option => option.work_package_id === item.work_package_id);
      if (finded) {
        item.disabledd = true;
      } else {
        item.disabledd = false;
      }
      return item;
    });
  }

  deleteSelectedOptionOutCome(tab) {
    this.selectedOptionsOutcome = this.selectedOptionsOutcome.filter(item => item.toc_result_id !== tab?.toc_result_id);
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

  deleteSelectedOptionEOI(tab) {
    this.selectedOptionsEOI = this.selectedOptionsEOI.filter(item => item.toc_result_id !== tab?.toc_result_id);
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
}
