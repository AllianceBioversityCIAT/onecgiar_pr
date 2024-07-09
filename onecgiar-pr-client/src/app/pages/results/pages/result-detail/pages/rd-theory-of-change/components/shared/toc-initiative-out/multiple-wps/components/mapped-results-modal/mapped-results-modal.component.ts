import { Component, Input } from '@angular/core';
import { MappedResultsModalServiceService } from './mapped-results-modal-service.service';

@Component({
  selector: 'app-mapped-results-modal',
  templateUrl: './mapped-results-modal.component.html',
  styleUrls: ['./mapped-results-modal.component.scss']
})
export class MappedResultsModalComponent {
  @Input() activeTab?: any = {};
  @Input() outputList?: any = null;
  @Input() resultLevelId?: number | string = 0;
  combine = true;

  constructor(public mappedResultService: MappedResultsModalServiceService) {}

  openInNewPage(resultCode: string, phase: string) {
    window.open(`/result/result-detail/${resultCode}/general-information?phase=${phase}`, '_blank');
  }

  dynamicModalTitle() {
    if (this.mappedResultService.isTarget) {
      return 'Target contributions';
    } else {
      return `Results mapped to the same TOC ${this.activeTab?.planned_result && this.resultLevelId === 1 ? 'Output' : 'Outcome'}`;
    }
  }

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') {
        this.combine = true;
        return;
      }
      const mappedResultTableHTML = document.getElementById('mappedResultTable');
      this.combine = !mappedResultTableHTML.querySelectorAll('th[aria-sort="descending"]').length && !mappedResultTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;

      return null;
    }, 100);
  }

  onCloseModal() {
    this.mappedResultService.mappedResultsModal = false;
    this.mappedResultService.isTarget = false;

    this.mappedResultService.targetData = {
      statement: '',
      measure: '',
      overall: '',
      date: '',
      contributors: []
    };
  }

  calcOverallProgress() {
    let sumOverallProgress = 0;

    this.mappedResultService.targetData.contributors.forEach((item: any) => {
      sumOverallProgress += Number(item.contributing_indicator);
    });

    return `${sumOverallProgress} out of ${this.mappedResultService.targetData.overall}`;
  }
}
