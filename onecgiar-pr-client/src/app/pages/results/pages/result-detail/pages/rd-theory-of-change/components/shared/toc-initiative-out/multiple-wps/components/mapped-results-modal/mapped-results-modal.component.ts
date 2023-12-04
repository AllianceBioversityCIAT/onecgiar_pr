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
  combine = true;

  constructor(public mappedResultService: MappedResultsModalServiceService) {}

  openInNewPage(resultCode: string, phase: string, isLink: boolean) {
    if (!isLink) return null;

    window.open(`/result/result-detail/${resultCode}/general-information?phase=${phase}`, '_blank');
  }

  dynamicModalTitle() {
    if (this.mappedResultService.isTarget) {
      return 'Target contributions';
    } else {
      return 'Results mapped to the same TOC Output';
    }
  }

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') return (this.combine = true);
      const resultListTableHTML = document.getElementById('resultListTable');
      this.combine = !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length && !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;

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
