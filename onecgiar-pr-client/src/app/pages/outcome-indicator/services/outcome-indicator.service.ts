import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class OutcomeIndicatorService {
  eoisData: any = [];
  initiativeIdFilter = '';
  loading = signal(false);
  searchText = signal<string>('');

  constructor(public api: ApiService) {}

  getEOIsData() {
    this.loading.set(true);
    this.api.resultsSE.GET_contributionsToIndicatorsEOIS(this.initiativeIdFilter).subscribe({
      next: res => {
        this.eoisData = res?.data?.[0]?.toc_results;
        this.loading.set(false);
      },
      error: error => {
        console.error(error);
        this.loading.set(false);
      }
    });
  }
}
