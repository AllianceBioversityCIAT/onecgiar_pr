import { Injectable, signal } from '@angular/core';
import { IndicatorData } from '../models/indicator-data.model';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { AuthService } from '../../../../../shared/services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class IndicatorDetailsService {
  indicatorData = signal<IndicatorData>(new IndicatorData());
  indicatorId = signal<string>('');
  platformId = signal<string>('');

  // Modal
  indicatorResultsModal = signal<{ value: boolean }>({ value: false });
  textToSearch = signal<{ value: string }>({ value: '' });
  indicatorResults = signal<any[]>([]);

  constructor(
    private readonly resultsApiService: ResultsApiService,
    private readonly authSE: AuthService
  ) {}

  getIndicatorDetailsResults(initiativeId: string) {
    this.resultsApiService.GET_contributionsDetailsResults(this.authSE.localStorageUser.id, initiativeId).subscribe(res => {
      res.response.forEach(result => {
        if (this.indicatorData().contributing_results.some(r => r.result_id === result.id)) {
          result.is_added = true;
          result.is_saved = true;
        }
      });

      this.indicatorResults.set(res.response);
    });
  }
}
