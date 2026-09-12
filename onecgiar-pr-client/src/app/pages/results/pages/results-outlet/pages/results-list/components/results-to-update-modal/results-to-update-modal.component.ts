import { Component } from '@angular/core';
import { CurrentResult } from '../../../../../../../../shared/interfaces/current-result.interface';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';

interface UpdateColumn {
  title: string;
  attr: string;
  width: string;
}

/** Rows from `resultsList` plus list-only display fields from the update-results payload. */
export type UpdateResultRow = CurrentResult & {
  is_new?: boolean;
  full_name?: string;
};

@Component({
  selector: 'app-results-to-update-modal',
  templateUrl: './results-to-update-modal.component.html',
  styleUrls: ['./results-to-update-modal.component.scss'],
  standalone: false
})
export class ResultsToUpdateModalComponent {
  text_to_search = '';
  mobilePage = 0;
  mobileRows = 10;

  readonly mobileRowOptions = [10, 25, 50];

  readonly columnOrder: UpdateColumn[] = [
    { title: 'Title', attr: 'title', width: '280px' },
    { title: 'Phase', attr: 'phase_name', width: '160px' },
    { title: 'Indicator category', attr: 'result_type', width: '180px' },
    { title: 'Submitter', attr: 'submitter', width: '88px' },
    { title: 'Status', attr: 'status_name', width: '110px' },
    { title: 'Created', attr: 'created_date', width: '108px' },
    { title: 'Created by', attr: 'full_name', width: '140px' }
  ];

  constructor(public api: ApiService, private readonly retrieveModalSE: RetrieveModalService) {}

  closeModal(): void {
    this.api.dataControlSE.updateResultModal = false;
  }

  onSearchChange(value: string): void {
    this.text_to_search = value;
    this.mobilePage = 0;
  }

  onMobileRowsChange(): void {
    this.mobilePage = 0;
  }

  mobileSlice(list: UpdateResultRow[] | null | undefined): UpdateResultRow[] {
    if (!list?.length) return [];
    const start = this.mobilePage * this.mobileRows;
    return list.slice(start, start + this.mobileRows);
  }

  mobileRangeLabel(list: UpdateResultRow[] | null | undefined): string {
    const total = list?.length ?? 0;
    if (!total) return '0 results';
    const start = this.mobilePage * this.mobileRows + 1;
    const end = Math.min(total, (this.mobilePage + 1) * this.mobileRows);
    return `${start}–${end} of ${total}`;
  }

  canMobilePrev(): boolean {
    return this.mobilePage > 0;
  }

  canMobileNext(list: UpdateResultRow[] | null | undefined): boolean {
    const total = list?.length ?? 0;
    return (this.mobilePage + 1) * this.mobileRows < total;
  }

  mobilePrev(): void {
    if (this.canMobilePrev()) this.mobilePage -= 1;
  }

  mobileNext(list: UpdateResultRow[] | null | undefined): void {
    if (this.canMobileNext(list)) this.mobilePage += 1;
  }

  viewResultHref(result: { result_code?: string | number; version_id?: string | number }): string {
    return `/result/result-detail/${result?.result_code}?phase=${result?.version_id}`;
  }

  onPressAction(result: CurrentResult): void {
    this.retrieveModalSE.title = result?.title ?? '';
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
    this.api.dataControlSE.chagePhaseModal = true;
  }
}
